import { createWriteStream, existsSync } from "fs";
import { Response } from "undici";
import _path from "path";
import OcdlError from "../struct/OcdlError";
import Util from "../util";
import EventEmitter from "events";
import { BeatMapSet } from "../struct/BeatMapSet";
import Manager from "./Manager";

import PQueue from "p-queue";
import { Requestor } from "./Requestor";
// Define an interface for the events that the DownloadManager class can emit
interface DownloadManagerEvents {
  downloaded: (beatMapSet: BeatMapSet) => void;
  error: (beatMapSet: BeatMapSet, e: unknown) => void;
  retrying: (beatMapSet: BeatMapSet) => void;
  downloading: (beatMapSet: BeatMapSet) => void;
  rateLimited: () => void;
  dailyRateLimited: (beatMapSets: BeatMapSet[]) => void;
  blocked: (beatMapSets: BeatMapSet[]) => void;
  unavailable: (beatMapSets: BeatMapSet[]) => void;
  // End is emitted along with un-downloaded beatmap
  end: (beatMapSets: BeatMapSet[]) => void;
}

export declare interface DownloadManager extends Manager {
  on<U extends keyof DownloadManagerEvents>(
    event: U,
    listener: DownloadManagerEvents[U]
  ): this;

  emit<U extends keyof DownloadManagerEvents>(
    event: U,
    ...args: Parameters<DownloadManagerEvents[U]>
  ): boolean;
}

export class DownloadManager extends EventEmitter implements DownloadManager {
  path: string;

  // Queue for concurrency downloads
  private queue: PQueue;
  private downloadedBeatMapSetSize = 0;
  private remainingDownloadsLimit: number | null;
  private lastDownloadsLimitCheck: number | null = null;
  private testRequest = false;

  constructor(remainingDownloadsLimit: number | null) {
    super();

    this.remainingDownloadsLimit = remainingDownloadsLimit;

    this.path = _path.join(
      Manager.config.directory,
      Manager.collection.getCollectionFolderName()
    );

    this.queue = new PQueue({
      concurrency: Manager.config.parallel ? Manager.config.concurrency : 1,
      intervalCap: Manager.config.intervalCap,
      interval: 60e3, // Always one minute
    });
  }

  // The primary method for downloading beatmaps
  public bulkDownload(): void {
    // Add every download task to queue
    Manager.collection.beatMapSets.forEach((beatMapSet) => {
      void this.queue.add(async () => {
        await this._downloadFile(beatMapSet);
        Manager.collection.beatMapSets.delete(beatMapSet.id);
      });
    });

    // Emit if the download has been done
    this.queue.on("idle", () => {
      this.emit("end", this._getNotDownloadedBeatapSets());
    });

    this.on("rateLimited", () => {
      if (!this.queue.isPaused) {
        this.testRequest = true;
        this.queue.pause();
        this.queue.concurrency = 1;
        setTimeout(() => this.queue.start(), 60e3);
      }
    });
    return;
  }

  public getDownloadedBeatMapSetSize() {
    return this.downloadedBeatMapSetSize;
  }

  public getRemainingDownloadsLimit() {
    return this.remainingDownloadsLimit;
  }

  // Downloads a single beatmap file
  private async _downloadFile(
    beatMapSet: BeatMapSet,
    options: { retries: number; alt: boolean } = { retries: 3, alt: false } // Whether or not use the alternative mirror url
  ): Promise<boolean> {
    // Check if the daily rate limit hit
    if (
      this.remainingDownloadsLimit != null &&
      this.remainingDownloadsLimit <= 0
    ) {
      this.emit("dailyRateLimited", this._getNotDownloadedBeatapSets());
      return false;
    }

    // Request the download
    try {
      this.emit("downloading", beatMapSet);
      // Check if the specified directory exists
      // This is placed here to prevent crashes while user editing folder
      if (!this._checkIfDirectoryExists()) {
        this.path = process.cwd();
      }

      const response = await Requestor.fetchDownloadCollection(beatMapSet.id, {
        alternative: options.alt,
      });

      if (response.status === 429) {
        // If user still get 429 after a test request (60 seconds wait), then check if user is daily rate limited
        if (this.testRequest) {
          if (
            !this.lastDownloadsLimitCheck ||
            Date.now() - this.lastDownloadsLimitCheck > 5e3
          ) {
            // 5 seconds cooldown
            this.lastDownloadsLimitCheck = Date.now();
            const rateLimitStatus = await Requestor.checkRateLimitation();
            if (rateLimitStatus === 0) {
              this.emit("dailyRateLimited", this._getNotDownloadedBeatapSets());
            } else {
              this.remainingDownloadsLimit = rateLimitStatus;
            }
          }
        }

        this.emit("rateLimited");
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.queue.add(async () => await this._downloadFile(beatMapSet));
        return false;
      } else if (response.status === 403) {
        this.emit("blocked", this._getNotDownloadedBeatapSets());
        return false;
      } else if (response.status === 451) {
        this.emit("unavailable", this._getNotDownloadedBeatapSets());
        return false;
      } else if (response.status !== 200) {
        throw `Status Code: ${response.status}`;
      }

      if (this.testRequest) {
        this.testRequest = false;
        this.queue.concurrency = Manager.config.parallel
          ? Manager.config.concurrency
          : 1;
      }

      const fileName = this._getFilename(response);
      const file = createWriteStream(_path.join(this.path, fileName));
      if (response.body) {
        for await (const chunk of response.body) {
          file.write(chunk);
        }
      } else {
        throw "res.body is null";
      }
      file.end();

      this.downloadedBeatMapSetSize++;
      if (this.remainingDownloadsLimit != null) this.remainingDownloadsLimit--;
      this.emit("downloaded", beatMapSet);
    } catch (e) {
      // Retry the download by pushing the map to the end of the queue, and use the alternative URL if this is the last retry
      if (options.retries) {
        this.emit("retrying", beatMapSet);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.queue.add(
          async () =>
            await this._downloadFile(beatMapSet, {
              alt: options.retries === 1,
              retries: options.retries - 1,
            })
        );
      } else {
        // If there are no retries remaining,
        // "error" event will be emitted,
        Manager.collection.beatMapSets.set(beatMapSet.id, beatMapSet);
        this.emit("error", beatMapSet, e);
      }

      return false;
    }

    return true;
  }

  private _getNotDownloadedBeatapSets(): BeatMapSet[] {
    return Array.from(Manager.collection.beatMapSets).map(
      ([, beatMapSet]) => beatMapSet
    );
  }

  private _getFilename(response: Response): string {
    const headers = response.headers;
    const contentDisposition = headers.get("content-disposition");

    let fileName = "Untitled.osz"; // Default file name
    // Extract the file name from the "content-disposition" header if it exists
    if (contentDisposition) {
      const result = /filename=([^;]+)/g.exec(contentDisposition);

      // If the file name is successfully extracted, decode the string, and replace the forbidden characters
      if (result) {
        try {
          const decoded = decodeURIComponent(result[1]);
          const replaced = Util.replaceForbiddenChars(decoded);

          fileName = replaced;
        } catch (e) {
          throw new OcdlError("FILE_NAME_EXTRACTION_FAILED", e);
        }
      }
    }

    return fileName;
  }

  private _checkIfDirectoryExists(): boolean {
    return existsSync(this.path);
  }
}

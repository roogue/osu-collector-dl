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
  // End is emitted along with un-downloaded beatmap
  end: (beatMapSet: BeatMapSet[]) => void;
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
  private notDownloadedBeatMapSet: BeatMapSet[] = [];

  constructor() {
    super();

    this.path = _path.join(
      Manager.config.directory,
      Manager.collection.getReplacedName()
    );

    this.queue = new PQueue({
      concurrency: Manager.config.parallel ? Manager.config.concurrency : 1,
    });
  }

  // The primary method for downloading beatmaps
  public async bulkDownload(): Promise<void> {
    // Add every download task to queue
    Manager.collection.beatMapSets.forEach((beatMapSet) => {
      this.queue.add(async () => await this._downloadFile(beatMapSet));
    });

    // Emit if the download has been done
    this.queue.on("idle", () => {
      this.emit("end", this.notDownloadedBeatMapSet);
    });
    return;
  }

  getDownloadedBeatMapSetSize() {
    return this.downloadedBeatMapSetSize;
  }

  // Downloads a single beatmap file
  private async _downloadFile(
    beatMapSet: BeatMapSet,
    options: { retries: number; alt: boolean } = { retries: 3, alt: false } // Whether or not use the alternative mirror url
  ): Promise<void> {
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
      this.emit("downloaded", beatMapSet);
    } catch (e) {
      // Retry the download with one fewer retry remaining, and use the alternative URL if this is the last retry
      if (options.retries) {
        this.emit("retrying", beatMapSet);

        await this._downloadFile(beatMapSet, {
          alt: options.retries === 1,
          retries: options.retries - 1,
        });
      } else {
        // If there are no retries remaining,
        // "error" event will be emitted,
        // and the beatmap will be added to the list of failed downloads
        this.emit("error", beatMapSet, e);
        this.notDownloadedBeatMapSet.push(beatMapSet);
      }
    }
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

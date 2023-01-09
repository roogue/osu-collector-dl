import { createWriteStream, existsSync } from "fs";
import { Response, fetch } from "undici";
import _path from "path";
import OcdlError from "../struct/OcdlError";
import Util from "../util";
import EventEmitter from "events";
import type { BeatMapSet } from "../struct/BeatMapSet";
import Manager from "./Manager";
import { Constant } from "../struct/Constant";

// Define an interface for the events that the DownloadManager class can emit
interface DownloadManagerEvents {
  downloaded: (beatMapSet: BeatMapSet) => void;
  error: (beatMapSet: BeatMapSet, e: unknown) => void;
  // Emitted when all beatmaps have finished downloading (or have failed to download)
  end: (beatMapSet: BeatMapSet[]) => void;
  retrying: (beatMapSet: BeatMapSet) => void;
  downloading: (beatMapSet: BeatMapSet) => void;
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
  // Whether to download beatmaps in parallel or sequentially
  parallel: boolean;
  // The number of beatmaps to download in parallel (if `parallel` is true)
  concurrency: number;
  not_downloaded: BeatMapSet[] = [];

  constructor() {
    super();

    this.path = _path.join(
      Manager.config.directory,
      Manager.collection.getReplacedName()
    );
    this.parallel = Manager.config.parallel;
    this.concurrency = Manager.config.concurrency;
  }

  // The primary method for downloading beatmaps
  public async bulk_download(): Promise<void> {
    // If `parallel` is true, download beatmaps in parallel using the `_impulse` method
    if (this.parallel) {
      await this._impulse();
    } else {
      // Otherwise, download beatmaps sequentially
      for (const [_, beatMapSet] of Manager.collection.beatMapSets) {
        await this._downloadFile(beatMapSet);
      }
    }

    this.emit("end", this.not_downloaded);
  }

  // Downloads a single beatmap file
  private async _downloadFile(
    beatMapSet: BeatMapSet,
    options: { retries: number; alt?: boolean } = { retries: 3 } // Whether or not use the alternative mirror url
  ): Promise<void> {
    // Construct the URL for the beatmap file
    const url =
      (options.alt ? Constant.OsuMirrorAltApiUrl : Constant.OsuMirrorApiUrl) +
      beatMapSet.id;

    // Request the download
    try {
      this.emit("downloading", beatMapSet);

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw `Status code: ${res.status}`;
      // Extract the file name from the response headers
      const fileName = this._getFilename(res);
      // Check if the specified directory exists
      if (!this._checkIfDirectoryExists()) this.path = process.cwd();
      // Create a write stream for the file
      await new Promise<void>(async (resolve, reject) => {
        const file = createWriteStream(_path.join(this.path, fileName));
        file.on("error", (e) => {
          reject(e);
        });

        // Write the file in chunks as the data is received
        for await (const chunk of res.body!) {
          file.write(chunk);
        }

        file.end();
        resolve();
      });

      this.emit("downloaded", beatMapSet);
    } catch (e) {
      // If there are retries remaining, retry the download
      if (options.retries) {
        this.emit("retrying", beatMapSet);
        // Retry the download with one fewer retry remaining, and use the alternative URL if this is the last retry
        this._downloadFile(beatMapSet, {
          alt: options.retries === 1,
          retries: options.retries - 1,
        });
      } else {
        // If there are no retries remaining, emit the "error" event and add the beatmap to the list of failed downloads
        this.emit("error", beatMapSet, e);
        this.not_downloaded.push(beatMapSet);
      }
    }
  }

  private _getFilename(res: Response): string {
    const headers = res.headers;
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

  // Downloads beatmaps in parallel using the `concurrency` property to limit the number of concurrent downloads
  private async _impulse(): Promise<void> {
    const keys = Array.from(Manager.collection.beatMapSets.keys());
    const loop_amount = Math.ceil(
      Manager.collection.beatMapSets.size / this.concurrency
    );

    for (let i = 0; i < loop_amount; i++) {
      const promises: Promise<void>[] = [];

      // Calculate the range where the downloads should process
      const start = i * this.concurrency;
      const end = (i + 1) * this.concurrency;
      const range = keys.slice(start, end);

      // For the beatmap set on the range, push to a promise and download it in a burst
      for (const id of range) {
        const beatMapSet = Manager.collection.beatMapSets.get(id)!; // Always have a value
        promises.push(this._downloadFile(beatMapSet));
      }

      await Promise.all(promises);
    }
  }

  private _checkIfDirectoryExists(): boolean {
    return existsSync(this.path);
  }
}

import { createWriteStream, existsSync } from "fs";
import { Response, fetch } from "undici";
import _path from "path";
import OcdlError from "../struct/OcdlError";
import Util from "../util";
import EventEmitter from "events";
import { config } from "../config";
import type { BeatMapSet } from "../struct/BeatMapSet";
import type { Collection } from "../struct/Collection";

interface DownloadManagerEvents {
  downloaded: (beatMapSet: BeatMapSet) => void;
  error: (beatMapSet: BeatMapSet, e: unknown) => void;
  end: (beatMapSet: BeatMapSet[]) => void;
  retrying: (beatMapSet: BeatMapSet) => void;
  downloading: (beatMapSet: BeatMapSet) => void;
}

export declare interface DownloadManager {
  on<U extends keyof DownloadManagerEvents>(
    event: U,
    listener: DownloadManagerEvents[U]
  ): this;

  emit<U extends keyof DownloadManagerEvents>(
    event: U,
    ...args: Parameters<DownloadManagerEvents[U]>
  ): boolean;
}

export class DownloadManager extends EventEmitter {
  path: string;
  parallel: boolean;
  concurrency: number;
  osuMirrorUrl: string;
  altOsuMirrorUrl: string;
  collection: Collection;
  not_downloaded: BeatMapSet[] = [];

  constructor(collection: Collection) {
    super();
    this.path = _path.join(config.directory, collection.name);
    this.parallel = config.parallel;
    this.concurrency = config.concurrency;
    this.osuMirrorUrl = config.osuMirrorApiUrl;
    this.altOsuMirrorUrl = config.altOsuMirrorUrl;
    this.collection = collection;
  }

  public async bulk_download(): Promise<void> {
    if (this.parallel) {
      await this.impulse();
    } else {
      this.collection.beatMapSets.forEach(async (beatMapSet) => {
        await this._downloadFile(beatMapSet);
      });
    }

    this.emit("end", this.not_downloaded);
  }

  private async _downloadFile(
    beatMapSet: BeatMapSet,
    options: { retries: number; alt?: boolean } = { retries: 3 } // Whether or not use the alternative mirror url
  ): Promise<void> {
    const url =
      (options.alt ? this.altOsuMirrorUrl : this.osuMirrorUrl) + beatMapSet.id;

    // Request download
    try {
      this.emit("downloading", beatMapSet);

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw `Status code: ${res.status}`;
      // Get file name
      const fileName = this.getFilename(res);
      // Check if directory exists
      if (!this.checkIfDirectoryExists()) this.path = process.cwd();
      // Create write stream
      await new Promise<void>(async (resolve, reject) => {
        const file = createWriteStream(_path.join(this.path, fileName));
        file.on("error", (e) => {
          reject(e);
        });

        for await (const chunk of res.body!) {
          //  Write to file
          file.write(chunk);
        }

        file.end();
        resolve();
      });

      this.emit("downloaded", beatMapSet);
    } catch (e) {
      if (options.retries) {
        this.emit("retrying", beatMapSet);
        this._downloadFile(beatMapSet, {
          alt: options.retries === 1,
          retries: options.retries - 1,
        });
      } else {
        this.emit("error", beatMapSet, e);
        this.not_downloaded.push(beatMapSet);
      }
    }
  }

  private getFilename(res: Response): string {
    const headers = res.headers;
    const contentDisposition = headers.get("content-disposition");

    let fileName = "Untitled.osz"; // Default file name
    // Extract filename from content-disposition header.
    if (contentDisposition) {
      const result = /filename=([^;]+)/g.exec(contentDisposition);

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

  private async impulse(): Promise<void> {
    const keys = Array.from(this.collection.beatMapSets.keys());
    const loop_amount = Math.ceil(
      this.collection.beatMapSets.size / this.concurrency
    );

    for (let i = 0; i < loop_amount; i++) {
      const promises: Promise<void>[] = [];

      // Burst
      const start = i * this.concurrency;
      const end = (i + 1) * this.concurrency;
      const range = keys.slice(start, end);

      for (const id of range) {
        const beatMapSet = this.collection.beatMapSets.get(id)!; // always have a value
        promises.push(this._downloadFile(beatMapSet));
      }

      await Promise.all(promises);
    }
  }

  private checkIfDirectoryExists(): boolean {
    return existsSync(this.path);
  }
}

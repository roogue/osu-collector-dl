import { createWriteStream, existsSync } from "fs";
import type Config from "../struct/Config";
import { Response, fetch } from "undici";
import _path from "path";
import Logger from "./Logger";
import OcdlError from "../struct/OcdlError";
import type { Collection } from "../types";
import Util from "../util";

export class DownloadManager {
  path: string;
  parallel: boolean;
  impulseRate: number;
  osuMirrorUrl: string;
  altOsuMirrorUrl: string;
  collection: Collection;

  constructor(config: Config, collection: Collection) {
    this.path = _path.join(config.directory, collection.name);
    this.parallel = config.parallel;
    this.impulseRate = config.dl_impulse_rate;
    this.osuMirrorUrl = config.osuMirrorApiUrl;
    this.altOsuMirrorUrl = config.altOsuMirrorUrl;
    this.collection = collection;
  }

  public async bulk_download(): Promise<void> {
    const ids = this.collection.beatmapsets.map((beatmapSet) => beatmapSet.id);

    if (this.parallel) {
      // Impulsive download if url length is more then this.impulseRate
      ids.length > this.impulseRate
        ? await this.impulse(ids, this.impulseRate)
        : await Promise.all(ids.map((id) => this._dl(id)));
    } else {
      // Sequential download
      for (let i = 0; i < ids.length; i++) await this._dl(ids[i]);
    }
  }

  private async _dl(id: number): Promise<void> {
    let url = this.osuMirrorUrl + id;

    // Request download
    console.log("Requesting: " + url);
    let res = await fetch(url, { method: "GET" }).catch();
    if (!this.isValidResponse(res)) {
      // Sometimes server failed with 503 status code, retrying is needed
      console.error("Requesting failed: " + url);

      // Use alternative mirror url
      url = this.altOsuMirrorUrl + id;
      console.log("Retrying: " + url);
      res = await fetch(url, { method: "GET" }).catch();

      if (!this.isValidResponse(res)) {
        console.error("Requesting failed: " + url);
        Logger.generateMissingLog(this.path, id.toString());
        return;
      }
    }

    try {
      // Get file name
      const fileName = this.getFilename(res);

      // Check if directory exists
      if (!this.checkIfDirectoryExists()) {
        console.error("No directory found: " + this.path);
        console.log("Use current working directory instead.");
        this.path = process.cwd();
      }
      // Create write stream
      const file = createWriteStream(_path.join(this.path, fileName));
      file.on("error", (err) => {
        console.error(
          "This file could not be downloaded: " +
            fileName +
            " Due to error: " +
            err
        );
      });

      for await (const chunk of res.body!) {
        //  Write to file
        if (!chunk) continue;
        file.write(chunk);
      }

      // End the write stream
      file.end();

      console.log("Downloaded: " + url);
    } catch (e) {
      Logger.generateErrorLog(new OcdlError("REQUEST_DOWNLOAD_FAILED", e));
    } finally {
      return;
    }
  }

  private getFilename(res: Response): string {
    const headers = res.headers;
    const contentDisposition = headers.get("content-disposition");

    let fileName = "Untitled.osz"; // Default file name
    // Extract filename from content-disposition header.
    if (contentDisposition) {
      const result = /filename="(.+)"/g.exec(contentDisposition);

      if (result) {
        try {
          const replaced = Util.replaceForbiddenChars(result[1]);
          const decoded = decodeURIComponent(replaced);

          fileName = decoded;
        } catch (e) {
          Logger.generateErrorLog(
            new OcdlError("FILE_NAME_EXTRACTION_FAILED", e)
          );
        }
      }
    }

    return fileName;
  }

  private async impulse(ids: number[], rate: number): Promise<any[]> {
    const downloaded: any[] = [];

    const perLen = ids.length / rate;

    for (let i = 0; i < perLen; i++) {
      const promises: Promise<void>[] = [];
      /**
       * Bursting Rate
       */
      const start = i * rate;
      const end = (i + 1) * rate;
      const inRange = ids.slice(start, end);
      const p = inRange.map((id) => this._dl(id));
      promises.push(...p);

      /**
       * Resolve Promises
       */
      downloaded.push([...(await Promise.all(promises))]);
    }
    return downloaded;
  }

  private checkIfDirectoryExists(): boolean {
    return existsSync(this.path);
  }

  private isValidResponse(res: Response): boolean {
    return res.status === 200 && !!res.body;
  }
}

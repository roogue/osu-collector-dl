import { createWriteStream, existsSync } from "fs";
import type Config from "../struct/Config";
import { Response, fetch } from "undici";
import _path from "path";
import Logger from "./Logger";
import OcdlError from "../struct/OcdlError";
import type { Collection } from "../types";

export class DownloadManager {
  path: string;
  parallel: boolean;
  impulseRate: number;
  osuMirrorUrl: string;
  collection: Collection;

  constructor(config: Config, collection: Collection) {
    this.path = _path.join(config.directory, collection.name);
    this.parallel = config.parallel;
    this.impulseRate = config.dl_impulse_rate;
    this.osuMirrorUrl = config.osuMirrorApiUrl;
    this.collection = collection;
  }

  public async bulk_download() {
    const urls = this.collection.beatmapsets.map(
      (beatmapSet) => this.osuMirrorUrl + "download/" + beatmapSet.id
    );

    if (this.parallel) {
      // Impulsive download if url length is more then this.impulseRate
      urls.length > this.impulseRate
        ? this.impulse(urls, this.impulseRate)
        : await Promise.all(urls.map((url) => this._dl(url)));
    } else {
      // Sequential download
      for (let i = 0; i < urls.length; i++) await this._dl(urls[i]);
    }
  }

  private async _dl(url: string): Promise<void> {
    // Request download
    console.log("Requesting: " + url);
    const res = await fetch(url, { method: "GET" });
    if (res.status !== 200 || !res.body)
      return console.error("Requesting failed: " + url);

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

      for await (const chunk of res.body) {
        //  Write to file
        if (!chunk) continue;
        file.write(chunk);
      }

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

    // Extract filename from content-disposition header.
    const result = contentDisposition
      ? /filename="(.+)"/g.exec(contentDisposition)
      : "Untitled.osz";

    // Forbidden file name regex
    const regex = /( |\/|<|>|:|"|\\|\||\?|\*)+/g;

    return result
      ? decodeURIComponent(result[1].replace(regex, ""))
      : "Untitled.osz";
  }

  private async impulse(ids: string[], rate: number): Promise<any[]> {
    const downloaded: any[] = [];

    const perLen = ids.length / rate;

    for (let i = 0; i < perLen; i++) {
      const promises: Promise<any>[] = [];
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
}

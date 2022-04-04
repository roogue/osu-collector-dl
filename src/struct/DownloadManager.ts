import fs from "fs";
import axios from "axios";
import { resolve } from "path";
import { AxiosResponse } from "axios";
import { Readable } from "stream";

export class DownloadManager {
  public path: string;
  public parallel: boolean;

  constructor(path?: string, parallel?: boolean) {
    this.path = path ?? resolve(__dirname, "../../../downloads");
    this.parallel = parallel || false;
  }

  public async bulk_download(urls: string[]) {
    if (this.parallel) {
      const promises = urls.map((url) => this._dl(url));
      return await Promise.all(promises);
    } else {
      const res = [];
      for (let i = 0; i < urls.length; i++) {
        const d = this._dl(urls[i]);
        res.push(d);
      }
      return res.length ? res : null;
    }
  }

  private async _dl(url: string) {
    /**
     * GET Download Stream
     */
    const res = await axios
      .get(url, { responseType: "stream" })
      .catch(() => null);

    if (!res) return null;

    /**
     * Create Stream and Pipe
     */
    const filename = this.getFilename(res);
    const file = fs.createWriteStream(this.path + "/" + filename);
    res.data.pipe(file);

    return await new Promise<void>((resolve, reject) => {
      res.data.on("end", () => resolve());
      res.data.on("error", () => reject());
    });
  }

  private getFilename(response: AxiosResponse<Readable>): string {
    const headerNames = Object.keys(response.headers);
    const headerIndex = headerNames
      .map((h) => h.toLowerCase())
      .indexOf("content-disposition");
    const contentDispositionHeader = response.headers[
      headerNames[headerIndex]
    ] as string;
    const regexFilename = /filename="(.+)"/g;
    const regexResult = regexFilename.exec(contentDispositionHeader);

    if (regexResult) return decodeURIComponent(regexResult[1].replace(/( |\/)+/g, "_"));

    return "Untitled.osz";
  }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadManager = void 0;
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
class DownloadManager {
    constructor(path, parallel) {
        this.path = path !== null && path !== void 0 ? path : (0, path_1.resolve)(__dirname, "../../../downloads");
        this.parallel = parallel || false;
    }
    async bulk_download(urls) {
        if (this.parallel) {
            const promises = urls.map((url) => this._dl(url));
            return await Promise.all(promises);
        }
        else {
            const res = [];
            for (let i = 0; i < urls.length; i++) {
                const d = this._dl(urls[i]);
                res.push(d);
            }
            return res.length ? res : null;
        }
    }
    async _dl(url) {
        /**
         * GET Download Stream
         */
        const res = await axios_1.default
            .get(url, { responseType: "stream" })
            .catch(() => null);
        if (!res)
            return null;
        /**
         * Create Stream and Pipe
         */
        const filename = this.getFilename(res);
        const file = fs_1.default.createWriteStream(this.path + "/" + filename);
        res.data.pipe(file);
        return await new Promise((resolve, reject) => {
            res.data.on("end", () => resolve());
            res.data.on("error", () => reject());
        });
    }
    getFilename(response) {
        const headerNames = Object.keys(response.headers);
        const headerIndex = headerNames
            .map((h) => h.toLowerCase())
            .indexOf("content-disposition");
        const contentDispositionHeader = response.headers[headerNames[headerIndex]];
        const regexFilename = /filename="(.+)"/g;
        const regexResult = regexFilename.exec(contentDispositionHeader);
        if (regexResult)
            return decodeURIComponent(regexResult[1].replace(/( |\/)+/g, "_"));
        return "Untitled.osz";
    }
}
exports.DownloadManager = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
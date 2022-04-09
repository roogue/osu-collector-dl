"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadManager = void 0;
const fs_1 = require("fs");
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
const config_1 = require("../../config");
class DownloadManager {
    constructor(path, parallel) {
        this.path = path !== null && path !== void 0 ? path : (0, path_1.resolve)(__dirname, "../../../downloads");
        this.parallel = parallel !== null && parallel !== void 0 ? parallel : false;
    }
    async bulk_download(urls) {
        /**
         * Check If Directory Exist
         */
        this.checkDir();
        /**
         * Performs Downloads
         */
        if (this.parallel) {
            /**
             * Impulsive Download if Urls are Too Many
             */
            urls.length > config_1.config.dl_impulse_rate
                ? this.impulse(urls, config_1.config.dl_impulse_rate)
                : await Promise.all(urls.map((url) => this._dl(url)));
        }
        else {
            /**
             * Download Sequentially
             */
            for (let i = 0; i < urls.length; i++)
                await this._dl(urls[i]);
        }
    }
    async _dl(url) {
        /**
         * GET Download Stream
         */
        console.log("Requesting: " + url);
        const res = await axios_1.default
            .get(url, { responseType: "stream" })
            .catch(() => null);
        if (!res)
            return null;
        /**
         * Create Stream and Pipe
         */
        const filename = this.getFilename(res);
        const file = (0, fs_1.createWriteStream)(this.path + "/" + filename);
        await new Promise((resolve, reject) => {
            console.log("Downloading: " + filename);
            res.data.pipe(file);
            file.on("close", () => {
                console.log("Downloaded: " + filename);
                resolve();
            });
            file.on("error", reject);
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
        /**
         * Regex To Prevent Forbidden Directory Names
         */
        const regex = /( |\/|<|>|:|"|\\|\||\?|\*)+/g;
        return regexResult
            ? decodeURIComponent(regexResult[1].replace(regex, ""))
            : "Untitled.osz";
    }
    /**
     * Check If Directory Exist
     */
    checkDir() {
        if (!(0, fs_1.existsSync)(this.path)) {
            (0, fs_1.mkdirSync)(this.path);
        }
        return;
    }
    async impulse(ids, rate) {
        const downloaded = [];
        const perLen = ids.length / rate;
        for (let i = 0; i < perLen; i++) {
            const promises = [];
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
}
exports.DownloadManager = DownloadManager;
//# sourceMappingURL=DownloadManager.js.map
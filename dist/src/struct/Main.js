"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Main = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const config_1 = require("../../config");
const node_osu_1 = __importDefault(require("node-osu"));
const util_1 = require("../utils/util");
const DownloadManager_1 = require("./DownloadManager");
const axios_1 = __importDefault(require("axios"));
class Main {
    constructor(id, { parallel = false, path }) {
        this.url = config_1.config.osuCollector_url + id;
        this.browser = null;
        this.page = null;
        this.osuApi = config_1.config.api_key
            ? new node_osu_1.default.Api(config_1.config.api_key, { notFoundAsError: true })
            : null;
        this.DownloadManager = new DownloadManager_1.DownloadManager(path, parallel);
        this.options = { parallel, path };
    }
    async init() {
        /**
         * Initiate Browser and Page
         */
        this.browser = await puppeteer_1.default.launch({ headless: config_1.config.headless });
        this.page = await this.browser.newPage();
        await this.page
            .goto(this.url, { timeout: 0, waitUntil: "domcontentloaded" })
            .catch(console.error);
    }
    async scrape() {
        /**
         * Check Browser and Page Property
         */
        if (!this.browser)
            throw new Error("Browser is not initialized");
        if (!this.page)
            throw new Error("Page is not initialized");
        /**
         * Scroll to Bottom
         */
        config_1.config.optimisedScroll
            ? await this.optimisedScroll()
            : await this.autoScroll();
        /**
         * Evaluate Page Read Contents
         */
        const id = await this.page.$$eval(".sc-eCImPb", (el, config) => el
            .map((x) => x.getAttribute("href"))
            .filter((x) => x === null || x === void 0 ? void 0 : x.startsWith(config.beatmaps_url))
            .map((x) => x === null || x === void 0 ? void 0 : x.slice(config.beatmaps_url.length)), config_1.config);
        return id;
    }
    async download() {
        /**
         * Initiate Browser and Page
         */
        console.log("Initiating Browser...");
        await this.init();
        console.log("Headless Browser Launched.");
        /**
         * Scrape Page For Beatmap IDs
         */
        console.log("Scraping...");
        const beatmapsId = await this.scrape();
        if (!beatmapsId.length)
            throw new Error("No Beatmap Found");
        console.log(beatmapsId.length, " Beatmaps Found.");
        /**
         * Close Browser
         */
        await this.closeBrowser();
        /**
         * Resolve BeatmapIds Into BeatmapSets
         */
        console.log("Resolving Beatmaps...");
        const beatmapsSetIds = await this.resolveBeatmapSetsId(beatmapsId);
        const ids = (0, util_1.removeDuplicate)(beatmapsSetIds).filter((a) => a);
        if (!beatmapsSetIds.length)
            throw new Error("No Beatmap Found");
        console.log(ids);
        console.log("==============================");
        console.log(ids.length, " BeatmapSets Found.");
        /**
         * Perfoms Download
         */
        console.log(`Downloading to Path: '${this.DownloadManager.path}'`);
        await this.downloadBeatmapSets(ids);
        return;
    }
    /**
     * Utils
     */
    async downloadBeatmapSets(ids) {
        const baseUrl = config_1.config.osuMirror_url + "download/";
        const urls = ids.map((id) => baseUrl + id);
        return await this.DownloadManager.bulk_download(urls);
    }
    async resolveBeatmapSetsId(ids) {
        /**
         * Whether Fetch in Parallel
         */
        if (this.options.parallel) {
            /**
             * Impulsive Fetches if Ids is Too Many
             */
            if (ids.length > config_1.config.impulse_rate) {
                return await this.impulse(ids, config_1.config.impulse_rate, config_1.config.impulse_interval);
            }
            else {
                const promises = ids.map((id) => this.getBeatmapSets(id));
                return [...(await Promise.all(promises))];
            }
        }
        else {
            const beatmapsSet = [];
            for (let i = 0; i < ids.length; i++) {
                const b = await this.getBeatmapSets(ids[i]);
                beatmapsSet.push(b);
            }
            return beatmapsSet;
        }
    }
    async getBeatmapSets(id) {
        /**
         * Get Beatmaps Data from API
         */
        if (this.osuApi) {
            const sets = await this.osuApi.getBeatmaps({ b: id });
            return sets.length ? sets[0].beatmapSetId : null;
        }
        else {
            const baseUrl = config_1.config.osuMirror_url + "map/" + id;
            const sets = await axios_1.default.get(baseUrl).catch(() => null);
            return sets ? sets.data.ParentSetId : null;
        }
    }
    async impulse(ids, rate, interval) {
        const promises = [];
        const perLen = ids.length / rate;
        for (let i = 0; i < perLen; i++) {
            /**
             * Bursting Rate
             */
            const start = i * rate;
            const end = (i + 1) * rate;
            const inRange = ids.slice(start, end);
            const p = inRange.map((id) => this.getBeatmapSets(id));
            promises.push(...p);
            /**
             * Interval for Next Burst
             */
            await (0, util_1.sleep)(interval * 1e3);
        }
        return [...(await Promise.all(promises))];
    }
    async autoScroll() {
        if (!this.page)
            throw new Error("Page is not initialized");
        /**
         * Perform Auto Scroll
         */
        await this.page.evaluate(async (config) => await new Promise((resolve, _) => {
            let totalHeight = 0;
            const distance = config.scroll_distance;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, config.scroll_interval);
        }), config_1.config);
    }
    async optimisedScroll() {
        if (!this.page)
            throw new Error("Page is not initialized");
        /**
         * Perform Auto Scroll
         */
        return await this.page.evaluate(async (config) => await new Promise(async (resolve) => {
            while (true) {
                /**
                 * A B
                 *
                 * A yes B yes => no
                 * A yes B no => yes
                 * A no B yes => no
                 * A no B no => no
                 */
                const selector = !!document.querySelector("p > b") &&
                    !document.querySelector(".show-loading-animation");
                /**
                 * Break If Scrolled To Bottom
                 */
                if (selector)
                    break;
                /**
                 *Sleep Function
                 */
                await new Promise((r) => setTimeout(r, config.scroll_interval));
                window.scrollBy(0, document.body.scrollHeight);
            }
            resolve();
        }), config_1.config);
    }
    async closeBrowser() {
        if (!this.browser)
            throw new Error("Browser is not initialized");
        /**
         * Call a Close Method
         */
        await this.browser.close();
    }
}
exports.Main = Main;
//# sourceMappingURL=Main.js.map
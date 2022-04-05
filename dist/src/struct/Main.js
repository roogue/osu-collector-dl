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
class Main {
    constructor(id, { parallel = false, path }) {
        this.url = config_1.config.url + id;
        this.browser = null;
        this.page = null;
        this.osuApi = new node_osu_1.default.Api(config_1.config.api_key, { notFoundAsError: false });
        this.DownloadManager = new DownloadManager_1.DownloadManager(path, parallel);
        this.options = { parallel, path };
    }
    async init() {
        /**
         * Initiate Browser and Page
         */
        this.browser = await puppeteer_1.default.launch({ headless: true });
        this.page = await this.browser.newPage();
        await this.page.goto(this.url, { timeout: 0 }).catch(console.error);
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
        await this.autoScroll();
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
         * Resolve BeatmapIds Into BeatmapSets
         */
        console.log("Resolving Beatmaps...");
        const beatmapsSet = await this.resolveBeatmapSets(beatmapsId);
        const ids = (0, util_1.removeDuplicate)(beatmapsSet.map((b) => b.id));
        if (!beatmapsSet.length)
            throw new Error("No Beatmap Found");
        console.log(ids);
        console.log("==============================");
        console.log(ids.length, " BeatmapsSets Found.");
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
        const baseUrl = config_1.config.chimuApi_url;
        const urls = ids.map((id) => baseUrl + id);
        return await this.DownloadManager.bulk_download(urls);
    }
    async resolveBeatmapSets(ids) {
        /**
         * Whether Fetch in Parallel
         */
        if (this.options.parallel) {
            //30 is Default Anti Rate Limiting Value
            if (ids.length > 30) {
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
         * Get Beatmaps Data from osu! API
         */
        const sets = await this.osuApi.getBeatmaps({ b: id });
        return sets.length ? sets[0] : null;
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
}
exports.Main = Main;
//# sourceMappingURL=Main.js.map
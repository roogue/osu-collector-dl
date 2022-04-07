"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "./config.env" });
/**
 * WARNING: DO NOT CHANGE ANY OF THE SETTING IF YOU DON'T KNOW WHAT YOU'RE DOING
 */
exports.config = {
    /**
     * Whether or Not Fetches should be done in Parallel
     */
    parallel: true,
    url: "https://osucollector.com/collections/",
    beatmaps_url: "https://osu.ppy.sh/beatmaps/",
    chimuApi_url: "https://api.chimu.moe/v1/download/",
    api_key: process.env.api_key,
    /**
     * Scroll Option For Auto Scroll,
     * Change Depends on Your Internet Speed
     */
    scroll_distance: 1000,
    scroll_interval: 500,
    /**
     * Impulse Bursting For Api Requests
     * Change Depends on The Rate Limiter of Osu API
     *
     * This Config Only Useful When Fetch in Parallel
     *
     * If Error Still Occurs, Try False the Value Of Parallel
     * Or Increase the Impulse Interval
     * And Decrease Impulse Rate
     */
    rate_limit: 30,
    impulse_rate: 10,
    impulse_interval: 2,
    /**
     * Download Impulse Bursting For Api Requests
     * Change Depends on The Rate Limiter of Osu Mirror Api
     *
     * This Config Only Useful When Fetch in Parallel
     */
    dl_impulse_rate: 5, // Download Impulse Rate (Default: 5)
};
//# sourceMappingURL=config.js.map
import env from "dotenv";
env.config({ path: "./config.env" });

/**
 * WARNING: DO NOT CHANGE ANY OF THE SETTING IF YOU DON'T KNOW WHAT YOU'RE DOING
 */

export const config = {
  url: "https://osucollector.com/collections/", // Do Not Change
  beatmaps_url: "https://osu.ppy.sh/beatmaps/", // Do Not Change
  chimuApi_url: "https://api.chimu.moe/v1/download/", // Do Not Change

  api_key: process.env.api_key!, // Your osu API Key

  /**
   * Scroll Option For Auto Scroll,
   * Change Depends on Your Internet Speed
   */
  scroll_distance: 1000, // Scroll Distance
  scroll_interval: 500, // Scroll Interval

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
  rate_limit: 30, // Rate Limiter (Default: 30)
  impulse_rate: 10, // Impulse Rate (Default: 10)
  impulse_interval: 2, // Impulse Interval in Second (Default: 2)
};

import env from "dotenv";
env.config({ path: "./config.env" });

/**
 * WARNING: DO NOT CHANGE ANY OF THE SETTING IF YOU DON'T KNOW WHAT YOU'RE DOING
 */

export const config = {
  /**
   * Whether or Not Fetches And Downloads Should be Done in Parallel
   *
   * This is useful as it will speed up the process of downloading/fetching significantly.
   */
  parallel: true,

  /**
   * Base Url, Do Not Change.
   */
  osuCollector_url: "https://osucollector.com/collections/",
  beatmaps_url: "https://osu.ppy.sh/beatmaps/",
  osuMirror_url: "https://api.chimu.moe/v1/",

  /**
   * Api Key is for Resolving Beatmap to BeatmapSets via requesting Data from Osu!Api
   * If None is Provided, It Will Use Osu Mirror instead (Unstable)
   *
   * This provides a more stable and quicker way of resolving Beatmap to BeatmapSets
   *
   * Warning: You should not set your api key here, instead, set it in your config.env file for security reasons.
   */
  api_key: process.env.api_key || null,
  /**
   * Scroll Option For Auto Scroll,
   * You can Modify Depends on Your Internet Speed
   *
   * optimisedScroll - Whether or not to use optimised scroll to increase the fetching speed (Default: true)
   * scroll_distance - The distance to scroll (Default: 1000). This is only useful when optimisedScroll is false
   * scroll_interval - The interval of scrolling in ms(Default: 500).
   */
  optimisedScroll: true,
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
   *
   * rate_limit - A rate throttle for amount of requests (Default: 30)
   * impulse_rate - The amount of requests to be made per burst (Default: 10)
   * impulse_interval - The interval of requests in seconds (Default: 2)
   */
  rate_limit: 30,
  impulse_rate: 10,
  impulse_interval: 2,

  /**
   * Download Impulse Bursting For Api Requests
   * Change Depends on The Rate Limiter of Osu Mirror Api
   *
   * This Config Only Useful When Fetch in Parallel
   *
   * dl_impulse_rate - The amount of download requests to be made per burst (Default: 5)
   */
  dl_impulse_rate: 5,

  /**
   * Wheter Headless Mode Should be Used
   *
   * When false, browser will be invisible when processes is running.
   * Set to false may slightly increase the speed of the process.
   */
  headless: false,
};

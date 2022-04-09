import puppeteer from "puppeteer";
import { Browser, Page } from "puppeteer";
import { config } from "../../config";
import osu from "node-osu";
import { Options } from "../types";
import { sleep, removeDuplicate } from "../utils/util";
import { DownloadManager } from "./DownloadManager";
import axios from "axios";

export class Main {
  public url: string;
  public options: Options;
  protected browser: Browser | null;
  protected page: Page | null;
  protected osuApi: osu.Api | null;
  protected DownloadManager: DownloadManager;

  constructor(id: number, { parallel = false, path }: Options) {
    this.url = config.osuCollector_url + id;
    this.browser = null;
    this.page = null;
    this.osuApi = config.api_key
      ? new osu.Api(config.api_key, { notFoundAsError: true })
      : null;
    this.DownloadManager = new DownloadManager(path, parallel);
    this.options = { parallel, path };
  }

  private async init(): Promise<void> {
    /**
     * Initiate Browser and Page
     */
    this.browser = await puppeteer.launch({ headless: config.headless });
    this.page = await this.browser.newPage();
    await this.page
      .goto(this.url, { timeout: 0, waitUntil: "domcontentloaded" })
      .catch(console.error);
  }

  private async scrape(): Promise<string[]> {
    /**
     * Check Browser and Page Property
     */
    if (!this.browser) throw new Error("Browser is not initialized");
    if (!this.page) throw new Error("Page is not initialized");

    /**
     * Scroll to Bottom
     */
    config.optimisedScroll
      ? await this.optimisedScroll()
      : await this.autoScroll();

    /**
     * Evaluate Page Read Contents
     */
    const id = await this.page.$$eval(
      ".sc-eCImPb",
      (el, config: any) =>
        el
          .map((x) => x.getAttribute("href"))
          .filter((x) => x?.startsWith(config.beatmaps_url))
          .map((x) => x?.slice(config.beatmaps_url.length)) as string[],
      config
    );

    return id;
  }

  public async download(): Promise<void> {
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
    if (!beatmapsId.length) throw new Error("No Beatmap Found");
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
    const ids = removeDuplicate(beatmapsSetIds).filter((a) => a);
    if (!beatmapsSetIds.length) throw new Error("No Beatmap Found");
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
  private async downloadBeatmapSets(ids: string[]) {
    const baseUrl = config.osuMirror_url + "download/";
    const urls = ids.map((id) => baseUrl + id);
    return await this.DownloadManager.bulk_download(urls);
  }

  private async resolveBeatmapSetsId(ids: string[]): Promise<string[]> {
    /**
     * Whether Fetch in Parallel
     */
    if (this.options.parallel) {
      /**
       * Impulsive Fetches if Ids is Too Many
       */
      if (ids.length > config.impulse_rate) {
        return await this.impulse(
          ids,
          config.impulse_rate,
          config.impulse_interval
        );
      } else {
        const promises = ids.map((id) => this.getBeatmapSets(id));
        return [...(await Promise.all(promises))];
      }
    } else {
      const beatmapsSet = [];
      for (let i = 0; i < ids.length; i++) {
        const b = await this.getBeatmapSets(ids[i]);
        beatmapsSet.push(b);
      }
      return beatmapsSet;
    }
  }

  private async getBeatmapSets(id: string) {
    /**
     * Get Beatmaps Data from API
     */
    if (this.osuApi) {
      const sets = await this.osuApi.getBeatmaps({ b: id });
      return sets.length ? sets[0].beatmapSetId : null;
    } else {
      const baseUrl = config.osuMirror_url + "map/" + id;
      const sets = await axios.get(baseUrl).catch(() => null);
      return sets ? sets.data.ParentSetId : null;
    }
  }

  private async impulse(
    ids: string[],
    rate: number,
    interval: number
  ): Promise<any[]> {
    const promises: Promise<any>[] = [];

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
      await sleep(interval * 1e3);
    }
    return [...(await Promise.all(promises))];
  }

  private async autoScroll(): Promise<void> {
    if (!this.page) throw new Error("Page is not initialized");
    /**
     * Perform Auto Scroll
     */
    await this.page.evaluate(
      async (config) =>
        await new Promise<void>((resolve, _) => {
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
        }),
      config
    );
  }

  private async optimisedScroll(): Promise<void> {
    if (!this.page) throw new Error("Page is not initialized");
    /**
     * Perform Auto Scroll
     */

    return await this.page.evaluate(
      async (config) =>
        await new Promise<void>(async (resolve) => {
          while (true) {
            /**
             * A B
             *
             * A yes B yes => no
             * A yes B no => yes
             * A no B yes => no
             * A no B no => no
             */
            const selector =
              !!document.querySelector("p > b") &&
              !document.querySelector(".show-loading-animation");

            /**
             * Break If Scrolled To Bottom
             */
            if (selector) break;

            /**
             *Sleep Function
             */
            await new Promise((r) => setTimeout(r, config.scroll_interval));

            window.scrollBy(0, document.body.scrollHeight);
          }
          resolve();
        }),
      config
    );
  }

  private async closeBrowser() {
    if (!this.browser) throw new Error("Browser is not initialized");

    /**
     * Call a Close Method
     */
    await this.browser.close();
  }
}

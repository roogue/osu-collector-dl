import puppeteer from "puppeteer";
import { Browser, Page } from "puppeteer";
import { config } from "../config";
import osu from "node-osu";
import { Options } from "../types";
import { sleep, removeDuplicate, pkgFixes } from "../utils/util";
import { DownloadManager } from "./DownloadManager";
import axios from "axios";
import { beatmapsets } from "../types";

export class Main {
  public collectionUrl: string;
  public collectionApiUrl: string;
  public options: Options;
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected osuApi: osu.Api | null;
  protected DownloadManager: DownloadManager;

  constructor(id: number, { parallel = false, path = null }: Options) {
    // url is osuCollector's collection url with id
    this.collectionUrl = config.osuCollector_url + "collections/" + id;

    // apiUrl is osuCollector's collection api url with id
    this.collectionApiUrl = config.osuCollector_url + "api/collections/" + id;

    // osu's api, if api key is provided
    this.osuApi = config.api_key
      ? new osu.Api(config.api_key, { notFoundAsError: true })
      : null;

    // Create DownloadManager instance
    this.DownloadManager = new DownloadManager(path, parallel);

    // options
    this.options = { parallel, path };
  }

  private async initBrowser(): Promise<void> {
    /**
     * Initiate Browser and Page (If browser is available)
     */
    const executablePath = pkgFixes();

    this.browser = await puppeteer
      .launch({
        headless: config.headless,
        executablePath,
      })
      .catch(() => null);

    if (!this.browser) throw {};

    this.page = await this.browser.newPage();

    await this.page
      .goto(this.collectionUrl, { timeout: 0, waitUntil: "domcontentloaded" })
      .catch(console.error);
  }

  private async scrape(): Promise<string[]> {
    if (!this.browser) {
      /**
       * If No Browser, Make Request to osuCollector Api
       */
      const apiRes = await axios
        .get(this.collectionApiUrl, { responseType: "json" })
        .then((res) =>
          res.status === 200 ? (res.data.beatmapsets as beatmapsets[]) : null
        )
        .catch(() => null);

      // Map Response To Beatmapsets Ids
      return apiRes ? apiRes.map((obj) => obj.id.toString()) : [];
    } else {
      /**
       * If Browser, Scrape Page
       */
      if (!this.page) throw new Error("Page is not available");

      /**
       * Scroll to Bottom
       */
      config.optimizedScroll
        ? await this.optimizedScroll()
        : await this.autoScroll();

      /**
       * Evaluate Page Read Contents
       */
      const beatmapIds = await this.page.$$eval(
        ".sc-eCImPb",
        (el, config: any) =>
          el
            .map((x) => x.getAttribute("href"))
            .filter((x) => x?.startsWith(config.beatmaps_url))
            .map((x) => x?.slice(config.beatmaps_url.length)) as string[],
        config
      );

      /**
       * Close Browser
       */
      await this.closeBrowser();

      /**
       * Resolve BeatmapIds Into BeatmapSets
       */
      const beatmapsSetIds = await this.resolveBeatmapSetsId(beatmapIds);
      return removeDuplicate(beatmapsSetIds).filter((a) => a);
    }
  }

  public async download(): Promise<void> {
    if (config.browser) {
      /**
       * Initiate Browser and Page
       */
      console.log("Initiating Browser...");
      await this.initBrowser()
        .then(() => {
          console.log("Headless Browser Launched.");
        })
        .catch(() => {
          console.warn(
            "Browser is not available. Switching to browser-less method"
          );
        });
    }

    /**
     * Scrape Page For Beatmap IDs
     */
    console.log("Scraping...");
    const ids = await this.scrape();
    if (!ids.length) throw new Error("No BeatmapSets Found");

    console.log(ids);
    console.log("==============================");
    console.log(ids.length, " BeatmapSets Found.");

    /**
     * Performs Download
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

  private async optimizedScroll(): Promise<void> {
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

import puppeteer from "puppeteer";
import { Browser, Page } from "puppeteer";
import { config } from "../../config";
import osu from "node-osu";
import { Options } from "../types";
import { sleep, removeDuplicate } from "../utils/util";
import { DownloadManager } from "./DownloadManager";

export class Main {
  public url: string;
  public options: Options;
  protected browser: Browser | null;
  protected page: Page | null;
  protected osuApi: osu.Api;
  protected DownloadManager: DownloadManager;

  constructor(id: number, { parallel = false, path }: Options) {
    this.url = config.url + id;
    this.browser = null;
    this.page = null;
    this.osuApi = new osu.Api(config.api_key, { notFoundAsError: false });
    this.DownloadManager = new DownloadManager(path, parallel);
    this.options = { parallel, path };
  }

  private async init(): Promise<void> {
    /**
     * Initiate Browser and Page
     */
    this.browser = await puppeteer.launch({ headless: true });
    this.page = await this.browser.newPage();
    await this.page.goto(this.url, { timeout: 0 }).catch(console.error);
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
    await this.autoScroll();

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
     * Resolve BeatmapIds Into BeatmapSets
     */
    console.log("Resolving Beatmaps...");
    const beatmapsSet = await this.resolveBeatmapSets(beatmapsId);
    const ids = removeDuplicate(beatmapsSet.map((b) => b.id));
    if (!beatmapsSet.length) throw new Error("No Beatmap Found");
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
  private async downloadBeatmapSets(ids: string[]) {
    const baseUrl = config.chimuApi_url;
    const urls = ids.map((id) => baseUrl + id);
    return await this.DownloadManager.bulk_download(urls);
  }

  private async resolveBeatmapSets(ids: string[]): Promise<osu.Beatmap[]> {
    /**
     * Whether Fetch in Parallel
     */
    if (this.options.parallel) {
      //30 is Default Anti Rate Limiting Value
      if (ids.length > 30) {
        return await this.impulse(
          ids,
          config.impulse_rate,
          config.impulse_interval
        );
      } else {
        const promises = ids.map((id) => this.getBeatmapSets(id));
        return [...(await Promise.all(promises))] as osu.Beatmap[];
      }
    } else {
      const beatmapsSet = [];
      for (let i = 0; i < ids.length; i++) {
        const b = await this.getBeatmapSets(ids[i]);
        beatmapsSet.push(b as osu.Beatmap);
      }
      return beatmapsSet;
    }
  }

  private async getBeatmapSets(id: string) {
    /**
     * Get Beatmaps Data from osu! API
     */
    const sets = await this.osuApi.getBeatmaps({ b: id });
    return sets.length ? sets[0] : null;
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
}

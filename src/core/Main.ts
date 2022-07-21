import { DownloadManager } from "./DownloadManager";
import { request } from "undici";
import type Config from "../struct/Config";
import Logger from "./Logger";
import type { BeatMapSet, ResponseJson } from "../types";
import type { ResponseData } from "undici/types/dispatcher";

export default class Main {
  collectionUrl: string;
  collectionApiUrl: string;
  protected DownloadManager: DownloadManager;

  constructor(id: number, config: Config) {
    // url is osuCollector's collection url with id
    this.collectionUrl = config.osuCollector_url + "collections/" + id;

    // apiUrl is osuCollector's collection api url with id
    this.collectionApiUrl = config.osuCollector_url + "api/collections/" + id;

    // Create DownloadManager instance
    this.DownloadManager = new DownloadManager(config);
  }

  async run(): Promise<void> {
    // Fetch collection
    const apiRes = await this.fetchCollection().catch(() => null);
    if (!apiRes || apiRes.statusCode !== 200)
      return Logger.stayAliveLog(
        `Requesting collection failed. Status Code: ${apiRes?.statusCode}`
      );

    // Map beatmapSet ids
    const resData: ResponseJson | null = await apiRes.body
      .json()
      .catch(() => null);
    if (!resData || !resData.beatmapsets)
      return Logger.stayAliveLog("No beatmap set found.");

    // Map beatmapSet ids
    const beatMapSetIds = (resData.beatmapsets as BeatMapSet[]).map((data) =>
      data.id.toString()
    );

    console.log(beatMapSetIds.length + " BeatmapSet Found, Downloading...");

    // Download beatmapSets
    await this.DownloadManager.bulk_download(beatMapSetIds);

    return;
  }

  private async fetchCollection(): Promise<ResponseData> {
    // Fetch with undici
    return await request(this.collectionApiUrl, { method: "GET" });
  }
}

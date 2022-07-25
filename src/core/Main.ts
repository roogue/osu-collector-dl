import { DownloadManager } from "./DownloadManager";
import { request } from "undici";
import type Config from "../struct/Config";
import Logger from "./Logger";
import type { BeatMapV2, Collection, BeatMapV2ResData } from "../types";
import type { ResponseData } from "undici/types/dispatcher";
import OsdbGenerator from "./OsdbGenerator";
import OcdlError from "../struct/OcdlError";
import { existsSync, mkdirSync } from "fs";
import _path from "path";
import Util from "../util";

export default class Main {
  collectionApiUrl: string;
  collectionApiUrlV2: string;
  config: Config;

  constructor(id: number, config: Config) {
    // Quick hand api url for faster fetching
    this.collectionApiUrl = config.osuCollectorApiUrl + id;

    // Api url for full information
    this.collectionApiUrlV2 = config.osuCollectorApiUrl + id + "/beatmapsV2";

    this.config = config;
  }

  async run(): Promise<void> {
    // Fetch collection
    const apiRes = await this.fetchCollection().catch(() => null);
    if (!apiRes || apiRes.statusCode !== 200)
      return Logger.stayAliveLog(
        `Request collection failed. Status Code: ${apiRes?.statusCode}`
      );
    // Map beatmapSet ids
    const resData: Collection | null = await apiRes.body
      .json()
      .catch(() => null);
    if (!resData || !resData.beatmapsets?.length)
      return Logger.stayAliveLog("No beatmap set found.");

    // Create folder
    try {
      resData.name = Util.replaceForbiddenChars(resData.name);
      const path = _path.join(this.config.directory, resData.name);
      if (!existsSync(path)) mkdirSync(path);
    } catch (e) {
      Logger.generateErrorLog(new OcdlError("FOLDER_GENERATION_FAILED", e));
    }

    if (this.config.mode === 2) {
      // v2BeatMapInfo Cache
      const beatMapV2: BeatMapV2[] = [];

      let hasMorePage = true;
      let cursor = 0;
      while (hasMorePage) {
        // Request v2 collection
        const v2ApiResponse = await this.fetchCollectionV2(cursor).catch(
          () => null
        );

        if (!v2ApiResponse || v2ApiResponse.statusCode !== 200)
          return Logger.stayAliveLog(
            `Request collection V2 failed. Status Code: ${v2ApiResponse?.statusCode}`
          );

        const v2ResData: BeatMapV2ResData | null =
          await v2ApiResponse.body.json();
        if (!v2ResData) return Logger.stayAliveLog("Bad response.");

        try {
          const { nextPageCursor, hasMore, beatmaps } = v2ResData;
          if (!Util.isBoolean(hasMore)) {
            return Logger.stayAliveLog("Bad response."); // As precaution if data is inaccurate
          }

          // Set property
          hasMorePage = hasMore;
          cursor = nextPageCursor;

          // Add beatmap to cache
          beatMapV2.push(...beatmaps);

          console.log("Fetched " + beatMapV2.length + " Beatmaps");
        } catch (e) {
          Logger.generateErrorLog(new OcdlError("REQUEST_DATA_FAILED", e));
        }
      }
      // Generate .osdb
      console.log("Generating .osdb file...");
      const generator = new OsdbGenerator(this.config, resData, beatMapV2);
      await generator.writeOsdb();
      console.log("Generated!");
    }

    // Download beatmapSet
    console.log("Start Downloading...");
    const downloadManager = new DownloadManager(this.config, resData);
    await downloadManager.bulk_download();

    return;
  }

  private async fetchCollection(): Promise<ResponseData> {
    return await request(this.collectionApiUrl, { method: "GET" });
  }

  private async fetchCollectionV2(cursor: number = 0): Promise<ResponseData> {
    return await request(this.collectionApiUrlV2, {
      method: "GET",
      query: {
        perPage: 100,
        cursor,
      },
    });
  }
}

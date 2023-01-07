import { DownloadManager } from "./DownloadManager";
import { request } from "undici";
import type Config from "../struct/Config";
import OsdbGenerator from "./OsdbGenerator";
import OcdlError from "../struct/OcdlError";
import { existsSync, mkdirSync } from "fs";
import _path from "path";
import Util from "../util";
import type Monitor from "./Monitor";
import { config } from "../config";
import Logger from "./Logger";
import chalk from "chalk";

export default class Main {
  monitor: Monitor;
  config: Config = config;
  collectionApiUrl: string;
  collectionApiUrlV2: string;

  constructor(monitor: Monitor) {
    this.monitor = monitor;

    const id = monitor.collection.id;
    // Quick hand api url for faster fetching
    this.collectionApiUrl = this.config.osuCollectorApiUrl + id.toString();

    // Api url for full information
    this.collectionApiUrlV2 =
      this.config.osuCollectorApiUrl + id.toString() + "/beatmapsV2";
  }

  async run(): Promise<void> {
    // Fetch brief collection info
    const responseData = await this.fetchCollection();
    if (responseData instanceof OcdlError) throw responseData;
    this.monitor.collection.resolveData(responseData);

    // Task 3
    this.monitor.next();
    this.monitor.update();

    // Fetch full data if user wants generate osdb file
    if (this.config.mode === 2) {
      let hasMorePage: boolean = true;
      let cursor: number = 0;

      while (hasMorePage) {
        // Request v2 collection
        const v2ResponseData = await this.fetchCollection(true, cursor);
        if (v2ResponseData instanceof OcdlError) throw v2ResponseData;

        try {
          const { hasMore, nextPageCursor, beatmaps } = v2ResponseData;

          const und = Util.checkUndefined({
            hasMore,
            nextPageCursor,
            beatmaps,
          });
          if (und)
            throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

          // Resolve all required data
          this.monitor.collection.resolveFullData(beatmaps);

          // Set property
          hasMorePage = hasMore;
          cursor = nextPageCursor;

          const fetched_collection =
            this.monitor.condition.fetched_collection + beatmaps.length;
          this.monitor.setCondition({ fetched_collection });
          this.monitor.update();
        } catch (e) {
          throw new OcdlError("REQUEST_DATA_FAILED", e);
        }
      }
    }

    // Task 4
    this.monitor.next();
    this.monitor.update();

    // Create folder
    try {
      responseData.name = Util.replaceForbiddenChars(responseData.name);
      const path = _path.join(this.config.directory, responseData.name);
      if (!existsSync(path)) mkdirSync(path);
    } catch (e) {
      throw new OcdlError("FOLDER_GENERATION_FAILED", e);
    }

    // Task 5
    this.monitor.next();
    this.monitor.update();

    // Generate .osdb file
    if (this.config.mode === 2) {
      try {
        const generator = new OsdbGenerator(this.monitor);
        await generator.writeOsdb();
      } catch (e) {
        throw new OcdlError("GENERATE_OSDB_FAILED", e);
      }
    }

    // Task 6
    this.monitor.next();
    this.monitor.update();

    // Download beatmapSet
    try {
      const downloadManager = new DownloadManager(this.monitor);
      downloadManager.bulk_download();

      await new Promise<void>((resolve) => {
        downloadManager.on("downloading", (beatMapSet) => {
          this.monitor.appendLog(
            chalk.gray`Downloading [${beatMapSet.id}] ${beatMapSet.title ?? ""}`
          );
          this.monitor.update();
        });

        downloadManager.on("retrying", (beatMapSet) => {
          this.monitor.appendLog(
            chalk.yellow`Retrying [${beatMapSet.id}] ${beatMapSet.title ?? ""}`
          );
          this.monitor.update();
        });

        downloadManager.on("downloaded", (beatMapSet) => {
          const downloaded = this.monitor.condition.downloaded_beatmapset;
          this.monitor.setCondition({ downloaded_beatmapset: downloaded + 1 });
          this.monitor.appendLog(
            chalk.green`Downloaded [${beatMapSet.id}] ${beatMapSet.title ?? ""}`
          );
          this.monitor.update();
        });

        downloadManager.on("error", (beatMapSet, e) => {
          this.monitor.appendLog(
            chalk.red`Failed when downloading [${beatMapSet.id}] ${
              beatMapSet.title ?? ""
            }, due to error: ${e}`
          );
          this.monitor.update();
        });

        downloadManager.on("end", (beatMapSet) => {
          for (let i = 0; i < beatMapSet.length; i++) {
            Logger.generateMissingLog(
              this.monitor.collection.name,
              beatMapSet[i].id.toString()
            );
          }
          resolve();
        });
      });
    } catch (e) {
      throw e;
    }

    this.monitor.freeze("Download finished");

    return;
  }

  private async fetchCollection(
    v2: boolean = false,
    cursor: number = 0
  ): Promise<Record<string, any> | OcdlError> {
    // Check version of collection
    const url = v2 ? this.collectionApiUrlV2 : this.collectionApiUrl;
    const query: Record<string, any> = // Query is needed for V2 collection
      v2
        ? {
            perPage: 100,
            cursor,
          }
        : {};
    const data = await request(url, { method: "GET", query })
      .then(async (res) => {
        if (res.statusCode !== 200) throw `Status code: ${res.statusCode}`;
        return (await res.body.json()) as Record<string, any>;
      })
      .catch((e) => new OcdlError("REQUEST_DATA_FAILED", e));
    if (data instanceof OcdlError) throw data;

    return data;
  }
}

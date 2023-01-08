import { DownloadManager } from "./DownloadManager";
import { request } from "undici";
import OsdbGenerator from "./OsdbGenerator";
import OcdlError from "../struct/OcdlError";
import { existsSync, mkdirSync } from "fs";
import _path from "path";
import Util from "../util";
import Monitor from "./Monitor";
import Logger from "./Logger";
import chalk from "chalk";
import { Message, Msg } from "../struct/Message";
import Manager from "./Manager";

export default class Worker extends Manager {
  monitor: Monitor;

  constructor() {
    super();
    this.monitor = new Monitor();
  }

  async run(): Promise<void> {
    // Check if internet connection is presence
    const onlineStatus = await Util.isOnline();
    if (!onlineStatus)
      return this.monitor.freeze(
        new Message(Msg.NO_CONNECTION).toString(),
        true
      );

    await this.monitor.checkNewVersion();

    let id: number | null = null;
    let mode: number | null = null;

    try {
      // task 1
      this.monitor.next();

      // Get id
      while (id === null) {
        this.monitor.update();

        const result = Number(
          this.monitor.awaitInput(new Message(Msg.INPUT_ID).toString(), "none")
        );
        if (!isNaN(result)) id = result; // check if result is valid
        this.monitor.condition.retry_input = true;
      }

      Manager.collection.id = id;

      // task 2
      this.monitor.next();

      // Get mode
      while (mode === null) {
        this.monitor.update();
        const result = String(
          this.monitor.awaitInput(
            new Message(Msg.INPUT_MODE, {
              mode: Manager.config.mode === 2 ? "Yes" : "No",
            }).toString(),
            Manager.config.mode.toString()
          )
        );
        if (["n", "no", "1"].includes(result)) mode = 1;
        if (["y", "yes", "ass", "2"].includes(result)) mode = 2;
        this.monitor.condition.retry_mode = true;
      }

      Manager.config.mode = mode;
    } catch (e) {
      throw new OcdlError("GET_USER_INPUT_FAILED", e);
    }

    // Fetch brief collection info
    const responseData = await this.fetchCollection();
    if (responseData instanceof OcdlError) throw responseData;
    Manager.collection.resolveData(responseData);

    // Task 3
    this.monitor.next();
    this.monitor.update();

    // Fetch full data if user wants generate osdb file
    if (Manager.config.mode === 2) {
      let hasMorePage: boolean = true;
      let cursor: number = 0;

      while (hasMorePage) {
        // Request v2 collection
        const v2ResponseData = await this.fetchCollection(true, cursor);
        if (v2ResponseData instanceof OcdlError) throw v2ResponseData;

        try {
          const und = Util.checkUndefined(v2ResponseData, [
            "hasMore",
            "nextPageCursor",
            "beatmaps",
          ]);
          if (und)
            throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

          const { hasMore, nextPageCursor, beatmaps } = v2ResponseData;
          // Resolve all required data
          Manager.collection.resolveFullData(beatmaps);

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
      const path = _path.join(Manager.config.directory, responseData.name);
      if (!existsSync(path)) mkdirSync(path);
    } catch (e) {
      throw new OcdlError("FOLDER_GENERATION_FAILED", e);
    }

    // Task 5
    this.monitor.next();
    this.monitor.update();

    // Generate .osdb file
    if (Manager.config.mode === 2) {
      try {
        const generator = new OsdbGenerator();
        await generator.writeOsdb();
      } catch (e) {
        throw new OcdlError("GENERATE_OSDB_FAILED", e);
      }
    }

    // Task 6
    this.monitor.next();
    this.monitor.update();

    // Download beatmapSet
    // This is added for people who don't want to download beatmaps
    console.log(Msg.PRE_DOWNLOAD);
    await new Promise<void>((r) => setTimeout(r, 3e3));

    try {
      const downloadManager = new DownloadManager();
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
        this.monitor.setCondition({
          downloaded_beatmapset: downloaded + 1,
        });
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

      downloadManager.bulk_download();

      await new Promise<void>((resolve) => {
        downloadManager.on("end", (beatMapSet) => {
          for (let i = 0; i < beatMapSet.length; i++) {
            Logger.generateMissingLog(
              Manager.collection.name,
              beatMapSet[i].id.toString()
            );
          }
          resolve();
        });
      });
    } catch (e) {
      throw e;
    }

    this.monitor.freeze("\nDownload finished");

    return;
  }

  private async fetchCollection(
    v2: boolean = false,
    cursor: number = 0
  ): Promise<Record<string, any> | OcdlError> {
    // Check version of collection
    const url =
      Manager.config.osuCollectorApiUrl +
      Manager.collection.id.toString() +
      (v2 ? "/beatmapsV2" : "");

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

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
import { Constant } from "../struct/Constant";
import type { Cursors, Json, v2ResCollectionType } from "../types";

export default class Worker extends Manager {
  monitor: Monitor;

  constructor() {
    super();
    this.monitor = new Monitor();
  }

  async run(): Promise<void> {
    // Check if internet connection is presence
    const onlineStatus = await Util.isOnline();
    // Stop the process if user is not connected to internet
    if (!onlineStatus)
      return this.monitor.freeze(
        new Message(Msg.NO_CONNECTION).toString(),
        true
      );

    // Check for new version of this program
    // eslint-disable-next-line
    this.monitor.checkNewVersion().catch();

    let id: number | null = null;
    let mode: number | null = null;

    try {
      // Task 1
      this.monitor.next();

      // Get the collection id from user input
      while (id === null) {
        this.monitor.update();

        const result = Number(
          this.monitor.awaitInput(new Message(Msg.INPUT_ID).toString(), "none")
        );
        // Check if result is valid
        if (!isNaN(result)) id = result;
        // Set retry to true to display the hint if user incorrectly inserted unwanted value
        this.monitor.condition.retry_input = true;
      }

      // Set collection id after getting input from user
      Manager.collection.id = id;

      // Task 2
      this.monitor.next();

      // Get the working mode from user input
      while (mode === null) {
        this.monitor.update();

        const result = String(
          this.monitor.awaitInput(
            new Message(Msg.INPUT_MODE, {
              mode: Manager.config.mode === 2 ? "Yes" : "No",
            }).toString(),
            Manager.config.mode.toString() // Use default working mode from config if the user did not insert any value
          )
        );
        // Validate if the user input is 1 or 2
        if (["n", "no", "1"].includes(result)) mode = 1;
        if (["y", "yes", "ass", "2"].includes(result)) mode = 2;
        // Set retry to true to display the hint if user incorrectly inserted unwanted value
        this.monitor.condition.retry_mode = true;
      }

      // Set the working mode after getting input from user
      Manager.config.mode = mode;
    } catch (e) {
      throw new OcdlError("GET_USER_INPUT_FAILED", e);
    }

    // Fetch brief collection info
    try {
      const responseData = await this._fetchCollection();
      Manager.collection.resolveData(responseData);
    } catch (e) {
      throw new OcdlError("REQUEST_DATA_FAILED", e);
    }

    // Task 3
    this.monitor.next();
    this.monitor.update();

    // Fetch full data if user wants to generate osdb file
    if (Manager.config.mode === 2) {
      try {
        // Check if cursors was already fetched and stored in database
        let cursors: Cursors | undefined = undefined;
        // Fetch cursors only if parallel mode is selected
        if (Manager.config.parallel) {
          cursors = await this._fetchCursors().catch(() => undefined);
        }
        // If no cursors was fetched or the database is down/errored
        if (!cursors) {
          // Loop through every beatmaps in the collection
          let cursor: number | undefined = undefined;
          do {
            const data = await this._fetchCollection(true, cursor);
            const und = Util.checkUndefined(data, [
              "nextPageCursor",
              "beatmaps",
            ]);
            if (und) {
              throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
            }
            const { nextPageCursor, beatmaps } = data as v2ResCollectionType;
            cursor = nextPageCursor;
            Manager.collection.resolveFullData(beatmaps);

            // Update the current condition of monitor to display correct data
            const fetched_collection =
              this.monitor.condition.fetched_collection + beatmaps.length;
            this.monitor.setCondition({ fetched_collection });
            this.monitor.update();
          } while (cursor);
        } else {
          // Fetch all beatmaps in the collection with cursors from database
          const fetchCollectionPromise = [] as Promise<Json>[];
          for (const cursor of cursors) {
            fetchCollectionPromise.push(this._fetchCollection(true, cursor));
          }

          const dataArray = await Promise.all(fetchCollectionPromise);
          for (const data of dataArray) {
            const und = Util.checkUndefined(data, ["beatmaps"]);
            if (und) {
              throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
            }

            const { beatmaps } = data as v2ResCollectionType;
            Manager.collection.resolveFullData(beatmaps);

            // Update the current condition of monitor to display correct data
            const fetched_collection =
              this.monitor.condition.fetched_collection + beatmaps.length;
            this.monitor.setCondition({ fetched_collection });
            this.monitor.update();
          }
        }
      } catch (e) {
        throw new OcdlError("REQUEST_DATA_FAILED", e);
      }
    }

    // Task 4
    this.monitor.next();
    this.monitor.update();

    // Create folder for downloading beatmaps and generating osdb file
    try {
      const path = _path.join(
        Manager.config.directory,
        Manager.collection.getReplacedName()
      );
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
        generator.writeOsdb();
      } catch (e) {
        throw new OcdlError("GENERATE_OSDB_FAILED", e);
      }
    }

    // Task 6
    this.monitor.next();
    this.monitor.update();

    // Set a 3 seconds delay before the download start
    // This is added for people who only want to generate osdb file
    console.log(Msg.PRE_DOWNLOAD);
    await new Promise<void>((r) => setTimeout(r, 3e3));

    try {
      const downloadManager = new DownloadManager();
      // Listen to current download state and log into console
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

      const notDownloadedBeatMapSet = await downloadManager.bulk_download();
      // For beatmap sets which were failed to download, generate a missing log to notice the user
      for (let i = 0; i < notDownloadedBeatMapSet.length; i++) {
        Logger.generateMissingLog(
          Manager.collection.name,
          notDownloadedBeatMapSet[i].id.toString()
        );
      }
    } catch (e) {
      throw new OcdlError("MANAGE_DOWNLOAD_FAILED", e);
    }

    this.monitor.freeze("\nDownload finished");
  }

  private async _fetchCollection(v2 = false, cursor = 0): Promise<Json> {
    // Use different endpoint for different version of api request
    const url =
      Constant.OsuCollectorApiUrl +
      Manager.collection.id.toString() +
      (v2 ? "/beatmapsV2" : "");

    const query: Record<string, number> = // Query is needed for V2 collection
      v2
        ? {
            perPage: 100,
            cursor, // Cursor which point to the next page
          }
        : {};

    const data = await request(url, { method: "GET", query })
      .then(async (res) => {
        if (res.statusCode !== 200) throw `Status code: ${res.statusCode}`;
        return (await res.body.json()) as Json;
      })
      .catch((e: unknown) => new OcdlError("REQUEST_DATA_FAILED", e));
    if (data instanceof OcdlError) throw data;

    return data;
  }

  private async _fetchCursors(): Promise<Cursors> {
    const url =
      Constant.OsuCollectorDbApiUrl +
      "collections/?id=" +
      Manager.collection.id.toString();

    const data = await request(url, { method: "GET", headersTimeout: 5e3 }) // Set 5 Seconds Timeout
      .then(async (res) => {
        if (res.statusCode !== 200) throw `Status code: ${res.statusCode}`;
        return (await res.body.json()) as Cursors;
      })
      .catch((e: unknown) => new OcdlError("REQUEST_DATA_FAILED", e));

    if (data instanceof OcdlError) throw data;
    return data;
  }
}

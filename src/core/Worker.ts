import { DownloadManager } from "./DownloadManager";
import OsdbGenerator from "./OsdbGenerator";
import OcdlError from "../struct/OcdlError";
import { existsSync, mkdirSync } from "fs";
import _path from "path";
import Util from "../util";
import Monitor, { DisplayTextColor, FreezeCondition } from "./Monitor";
import Logger from "./Logger";
import { Msg } from "../struct/Message";
import Manager from "./Manager";
import type { WorkingMode } from "../types";
import { Requestor, v2ResCollectionType } from "./Requestor";
import { LIB_VERSION } from "../version";

export default class Worker extends Manager {
  monitor: Monitor;

  constructor() {
    super();
    this.monitor = new Monitor();
  }

  async run(): Promise<void> {
    this.monitor.update();

    // Check if internet connection is presence
    this.monitor.displayMessage(Msg.CHECK_INTERNET_CONNECTION);
    const onlineStatus = await Util.isOnline();
    // Stop the process if user is not connected to internet
    if (!onlineStatus)
      return this.monitor.freeze(
        Msg.NO_CONNECTION,
        {},
        FreezeCondition.ERRORED
      );

    // Check for new version of this program
    this.monitor.displayMessage(Msg.CHECK_NEW_VERSION);
    const newVersion = await Requestor.checkNewVersion(LIB_VERSION);
    if (newVersion) {
      this.monitor.setCondition({ new_version: newVersion });
    }

    // Check daily rate limit
    this.monitor.displayMessage(Msg.CHECK_RATE_LIMIT);
    const rateLimitStatus = await Requestor.checkRateLimitation();
    if (rateLimitStatus === null) {
      this.monitor.freeze(
        Msg.UNABLE_TO_GET_DAILY_RATE_LIMIT,
        {},
        FreezeCondition.WARNING
      );
    }
    this.monitor.setCondition({ remaining_downloads: rateLimitStatus });

    let id: number | null = null;
    let mode: WorkingMode | null = null;

    try {
      // Task 1
      this.monitor.nextTask();

      // Get the collection id from user input
      while (id === null) {
        this.monitor.update();

        const result = parseInt(
          this.monitor.awaitInput(Msg.INPUT_ID, {}, "None")
        );

        // Check if result is valid
        if (!isNaN(result)) {
          id = result;
        }
        // Set retry to true to display the hint if user incorrectly inserted unwanted value
        this.monitor.setCondition({ retry_input: true });
      }

      // Set collection id after getting input from user
      Manager.collection.id = id;

      // Task 2
      this.monitor.nextTask();

      // Get the working mode from user input
      while (mode === null) {
        this.monitor.update();
        // Check if user hit their daily download rate limit, if so, continue to only generate .osdb, if not, let user select mode.
        if (rateLimitStatus === 0) {
          this.monitor.freeze(
            Msg.DAILY_RATE_LIMIT_HIT_WARN,
            {},
            FreezeCondition.WARNING
          );
          mode = 3 as WorkingMode;
        } else {
          const result = this.monitor.awaitInput(
            Msg.INPUT_MODE,
            { mode: Manager.config.mode.toString() },
            Manager.config.mode.toString() // Use default working mode from config if the user did not insert any value
          );

          // Validate if the user input is 1 or 2 or 3
          if (["1", "2", "3"].includes(result)) {
            mode = parseInt(result) as WorkingMode;
          }
          // Set retry to true to display the hint if user incorrectly inserted unwanted value
          this.monitor.setCondition({ retry_mode: true });
        }
      }

      // Set the working mode after getting input from user
      Manager.config.mode = mode;
    } catch (e) {
      throw new OcdlError("GET_USER_INPUT_FAILED", e);
    }

    // Fetch brief collection info
    try {
      const v1ResponseData = await Requestor.fetchCollection(
        Manager.collection.id
      );
      Manager.collection.resolveData(v1ResponseData);
    } catch (e) {
      throw new OcdlError("REQUEST_DATA_FAILED", e);
    }

    // Task 3
    this.monitor.nextTask();

    // Fetch full data if user wants to generate osdb file
    if (Manager.config.mode !== 1) {
      // Loop through every beatmaps in the collection
      let cursor: number | undefined = undefined;
      let fetchedCollectionCount = 0;
      do {
        const v2ResponseData = await Requestor.fetchCollection(
          Manager.collection.id,
          { v2: true, cursor }
        );

        const und = Util.checkUndefined(v2ResponseData, [
          "nextPageCursor",
          "beatmaps",
        ]);
        if (und) {
          throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
        }

        const { nextPageCursor, beatmaps } =
          v2ResponseData as v2ResCollectionType;
        cursor = nextPageCursor;
        Manager.collection.resolveFullData(beatmaps);

        // Update the current condition of monitor to display correct data
        fetchedCollectionCount += beatmaps.length;
        this.monitor.setCondition({
          fetched_collection: fetchedCollectionCount,
        });
        this.monitor.update();
      } while (cursor);
    }

    // Task 4
    this.monitor.nextTask();

    // Create folder for downloading beatmaps and generating osdb file
    try {
      const path = _path.join(
        Manager.config.directory,
        Manager.collection.getCollectionFolderName()
      );
      if (!existsSync(path)) {
        mkdirSync(path);
      }
    } catch (e) {
      throw new OcdlError("FOLDER_GENERATION_FAILED", e);
    }

    // Task 5
    this.monitor.nextTask();

    // Generate .osdb file
    if (Manager.config.mode !== 1) {
      try {
        const generator = new OsdbGenerator();
        generator.writeOsdb();
      } catch (e) {
        throw new OcdlError("GENERATE_OSDB_FAILED", e);
      }
    }

    if (Manager.config.mode === 3) {
      return this.monitor.freeze(Msg.GENERATED_OSDB, {
        name: Manager.collection.name,
      });
    }

    // Task 6
    this.monitor.nextTask();

    try {
      if (
        rateLimitStatus !== null &&
        rateLimitStatus < Manager.collection.beatMapSetCount
      ) {
        this.monitor.freeze(
          Msg.TO_DOWNLOADS_EXCEED_DAILY_RATE_LIMIT,
          {
            collection: Manager.collection.beatMapSetCount.toString(),
            limit: rateLimitStatus.toString(),
          },
          FreezeCondition.WARNING
        );
      }

      const downloadManager = new DownloadManager(rateLimitStatus);
      // Listen to current download state and log into console
      downloadManager
        .on("downloading", (beatMapSet) => {
          this.monitor.appendDownloadLog(
            Msg.DOWNLOADING_FILE,
            {
              id: beatMapSet.id.toString(),
              name: beatMapSet.title ?? "",
            },
            DisplayTextColor.SECONDARY
          );
          this.monitor.update();
        })
        .on("retrying", (beatMapSet) => {
          this.monitor.appendDownloadLog(
            Msg.RETRYING_DOWNLOAD,
            {
              id: beatMapSet.id.toString(),
              name: beatMapSet.title ?? "",
            },
            DisplayTextColor.SECONDARY
          );
          this.monitor.update();
        })
        .on("downloaded", (beatMapSet) => {
          const downloaded = downloadManager.getDownloadedBeatMapSetSize();
          const remainingDownloadsLimit =
            downloadManager.getRemainingDownloadsLimit();
          this.monitor.setCondition({
            downloaded_beatmapset: downloaded,
            remaining_downloads: remainingDownloadsLimit,
          });
          this.monitor.appendDownloadLog(
            Msg.DOWNLOADED_FILE,
            {
              id: beatMapSet.id.toString(),
              name: beatMapSet.title ?? "",
            },
            DisplayTextColor.SUCCESS
          );
          this.monitor.update();
        })
        .on("rateLimited", () => {
          this.monitor.appendDownloadLog(
            Msg.RATE_LIMITED,
            {},
            DisplayTextColor.DANGER
          );
          this.monitor.update();
        })
        .on("dailyRateLimited", (beatMapSets) => {
          // For beatmap sets which were failed to download, generate a missing log to notice the user
          Logger.generateMissingLog(
            Manager.collection.getCollectionFolderName(),
            beatMapSets
          );
          this.monitor.setCondition({ remaining_downloads: 0 });
          this.monitor.update();
          // Errored freeze will force user to quit the program
          this.monitor.freeze(
            Msg.DAILY_RATE_LIMIT_HIT,
            {},
            FreezeCondition.ERRORED
          );
        })
        .on("blocked", (beatMapSets) => {
          Logger.generateMissingLog(
            Manager.collection.getCollectionFolderName(),
            beatMapSets
          );
          this.monitor.freeze(Msg.REQUEST_BLOCKED, {}, FreezeCondition.ERRORED);
        })
        .on("unavailable", (beatMapSets) => {
          Logger.generateMissingLog(
            Manager.collection.getCollectionFolderName(),
            beatMapSets
          );
          this.monitor.freeze(
            Msg.RESOURCE_UNAVAILBALE,
            {},
            FreezeCondition.ERRORED
          );
        })
        .on("end", (beatMapSets) => {
          Logger.generateMissingLog(
            Manager.collection.getCollectionFolderName(),
            beatMapSets
          );
          this.monitor.freeze(Msg.DOWNLOAD_COMPLETED);
        })
        .on("error", (beatMapSet, e) => {
          this.monitor.appendDownloadLog(
            Msg.DOWNLOAD_FILE_FAILED,
            {
              id: beatMapSet.id.toString(),
              name: beatMapSet.title ?? "",
              error: String(e),
            },
            DisplayTextColor.DANGER
          );

          this.monitor.update();
        });

      downloadManager.bulkDownload();
    } catch (e) {
      throw new OcdlError("MANAGE_DOWNLOAD_FAILED", e);
    }
  }
}

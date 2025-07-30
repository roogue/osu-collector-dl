import chalk from "chalk";
import { clear, log } from "console";
import { Constant } from "../struct/Constant";
import { Message, Msg } from "../struct/Message";
import OcdlError from "../struct/OcdlError";
import Util from "../util";
import Manager from "./Manager";
import promptSync from "prompt-sync";
import { LIB_VERSION } from "../version";

interface Condition {
  new_version: string;
  retry_input: boolean;
  retry_mode: boolean;
  missing_log_found: boolean;
  retry_missing_log_input: boolean;
  fetched_collection: number;
  remaining_downloads: number | null; // Null happends when api wasn't requested successfully
  downloaded_beatmapset: number;
  download_log: string[];
}

export enum DisplayTextColor {
  PRIMARY = "yellowBright",
  SECONDARY = "grey",
  DANGER = "red",
  SUCCESS = "green",
  WHITE = "white",
}

export enum FreezeCondition {
  NORMAL,
  WARNING,
  ERRORED,
}

export default class Monitor extends Manager {
  // Current progress of the application
  private progress = 0;
  // Console prompt for user input and freezing purpose
  private prompt = promptSync({ sigint: true });
  // Object containing functions for each task
  private readonly task: Record<number, () => void>;

  private readonly condition: Condition;

  constructor() {
    super();

    this.condition = {
      new_version: "",
      retry_input: false,
      retry_mode: false,
      missing_log_found: false,
      retry_missing_log_input: false,
      fetched_collection: 0,
      downloaded_beatmapset: 0,
      remaining_downloads: 0,
      download_log: [],
    };

    // Set terminal title according to it's version
    Util.setTerminalTitle(`osu-collector-dl v${LIB_VERSION}`);

    this.task = {
      0: () => undefined, // Empty function
      1: this.p_input_id.bind(this), // Get Input id
      2: this.p_input_mode.bind(this), // Get Input mode
      3: this.p_fetch_brief_info.bind(this), // Fetch brief info
      4: this.p_check_folder.bind(this), // Check folder for missing logs or create new download folder
      5: this.p_fetch_collection.bind(this), // Fetch collection v2
      6: this.p_generate_osdb.bind(this), // Generate osdb
      7: this.p_download.bind(this), // Download beatmapset
    };
  }

  // Update display with current progress
  update(): void {
    clear();

    // If new version is available, display a message that notice the user
    if (this.condition.new_version) {
      this.notifyNewVersion();
    }

    // Display the collection id and name, as well as the current working mode
    this.displayHeader();

    // Display progress according to current task
    try {
      this.task[this.progress]();
    } catch (e) {
      throw new OcdlError("MESSAGE_GENERATION_FAILED", e);
    }
  }

  // Freeze the console
  freeze(
    message: Msg,
    variable: Record<string, string> | undefined = {},
    freezeCondition: FreezeCondition = FreezeCondition.NORMAL
  ): void {
    let messageColor: DisplayTextColor;
    switch (freezeCondition) {
      case FreezeCondition.NORMAL:
        messageColor = DisplayTextColor.SUCCESS;
        break;
      case FreezeCondition.WARNING:
        messageColor = DisplayTextColor.PRIMARY;
        break;
      case FreezeCondition.ERRORED:
        messageColor = DisplayTextColor.DANGER;
        break;
    }

    this.displayMessage(message, variable, messageColor);

    // Display exit only if freeze condition is errored.
    this.awaitInput(Msg.FREEZE, {
      action: freezeCondition == FreezeCondition.ERRORED ? "exit" : "continue",
    });

    // End the whole process if it is errored
    if (freezeCondition == FreezeCondition.ERRORED) {
      process.exit(1);
    }
  }

  displayMessage(
    message: Msg,
    variable: Record<string, string> | undefined = {},
    color: DisplayTextColor = DisplayTextColor.WHITE
  ) {
    const messageComponent = new Message(message, variable);

    log(chalk`{${color} ${messageComponent.toString()}}`);
  }

  awaitInput(
    message: Msg,
    variable: Record<string, string> | undefined = {},
    defaultValue = ""
  ): string {
    const messageComponent = new Message(message, variable);

    return this.prompt(messageComponent.toString() + " ", defaultValue);
  }

  // When called, the monitor will proceed to the next task
  // and will display different interface for different task
  nextTask(): void {
    this.progress++;
    this.update();
  }

  setCondition(new_condition: Partial<Condition>): void {
    Object.assign(this.condition, new_condition);
  }

  appendDownloadLog(
    message: Msg,
    variable: Record<string, string> | undefined = {},
    color: DisplayTextColor = DisplayTextColor.WHITE
  ): void {
    const messageComponent = new Message(message, variable);
    const log = chalk`{${color} ${messageComponent.toString()}}`;

    this.condition.download_log.unshift(log);
    this.condition.download_log.splice(Manager.config.logSize, 1);
  }

  private displayHeader(): void {
    this.displayMessage(
      Msg.HEADER,
      {
        id: Manager.collection.id.toString(),
        name: Manager.collection.name,
        mode: Manager.config.mode.toString(),
      },
      DisplayTextColor.PRIMARY
    );
  }

  private notifyNewVersion(): void {
    this.displayMessage(
      Msg.NEW_VERSION,
      {
        version: this.condition.new_version,
        url: Constant.GithubReleaseUrl + this.condition.new_version,
      },
      DisplayTextColor.SECONDARY
    );
  }

  // Task 1
  private p_input_id(): void {
    if (this.condition.retry_input) {
      this.displayMessage(Msg.INPUT_ID_ERR, {}, DisplayTextColor.DANGER);
    }
  }

  // Task 2
  private p_input_mode(): void {
    if (this.condition.remaining_downloads !== 0) {
      this.displayMessage(Msg.INPUT_MODE_DESCRIPTION);
    }

    if (this.condition.retry_mode) {
      this.displayMessage(Msg.INPUT_MODE_ERR, {}, DisplayTextColor.DANGER);
    }
  }

  // Task 3
  private p_fetch_brief_info(): void {
    this.displayMessage(Msg.FETCH_BRIEF_INFO, {
      id: Manager.collection.id.toString(),
    });
  }

  // Task 4
  private p_check_folder(): void {
    if (!this.condition.missing_log_found) {
      this.displayMessage(Msg.CREATING_FOLDER, {
        name: Manager.collection.name,
      });
    } else {
      this.displayMessage(Msg.PREVIOUS_DOWNLOAD_FOUND);

      if (this.condition.retry_missing_log_input) {
        this.displayMessage(
          Msg.INPUT_CONTINUE_DOWNLOAD_ERR,
          {},
          DisplayTextColor.DANGER
        );
      }
    }
  }

  // Task 5
  private p_fetch_collection(): void {
    const beatmaps_length = Manager.collection.beatMapCount.toString();

    this.displayMessage(Msg.FETCH_DATA, {
      amount: this.condition.fetched_collection.toString(),
      total: beatmaps_length,
    });
  }

  // Task 6
  private p_generate_osdb(): void {
    this.displayMessage(Msg.GENERATE_OSDB, {
      name: Manager.collection.name,
    });
  }

  // Task 7
  private p_download(): void {
    this.displayMessage(Msg.REMAINING_DOWNLOADS, {
      amount: this.condition.remaining_downloads?.toString() ?? "Unknown",
    });

    this.displayMessage(Msg.DOWNLOAD_FILES, {
      amount: this.condition.downloaded_beatmapset.toString(),
      total: Manager.collection.beatMapSetCount.toString(),
    });

    this.displayMessage(Msg.DOWNLOAD_LOG, {
      log: this.condition.download_log.join("\n"),
    });
  }
}

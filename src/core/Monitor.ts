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
  fetched_collection: number;
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
      fetched_collection: 0,
      downloaded_beatmapset: 0,
      download_log: [],
    };

    // Set terminal title according to it's version
    Util.setTerminalTitle(`osu-collector-dl v${LIB_VERSION}`);

    this.task = {
      0: () => undefined, // Empty function
      1: this.p_input_id.bind(this), // Get Input id
      2: this.p_input_mode.bind(this), // Get Input mode
      3: this.p_fetch_collection.bind(this), // Fetch collection
      4: this.p_create_folder.bind(this), // Fetch collection v2
      5: this.p_generate_osdb.bind(this), // Generate osdb
      6: this.p_download.bind(this), // Download beatmapset
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
    isErrored = false
  ): void {
    // If errored, the message is in red, otherwise green
    this.displayMessage(
      message,
      variable,
      isErrored ? DisplayTextColor.DANGER : DisplayTextColor.SUCCESS
    );

    this.awaitInput(Msg.FREEZE, { action: isErrored ? "exit" : "continue" });

    // End the whole process if it is errored
    if (isErrored) {
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

    return this.prompt(messageComponent + " ", defaultValue);
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
    this.displayMessage(Msg.INPUT_MODE_DESCRIPTION, {});

    if (this.condition.retry_mode) {
      this.displayMessage(Msg.INPUT_MODE_ERR, {}, DisplayTextColor.DANGER);
    }
  }

  // Task 3
  private p_fetch_collection(): void {
    const beatmaps_length = Manager.collection.beatMapCount.toString();

    this.displayMessage(Msg.FETCH_DATA, {
      amount: this.condition.fetched_collection.toString(),
      total: beatmaps_length,
    });
  }

  // Task 4
  private p_create_folder(): void {
    this.displayMessage(Msg.CREATE_FOLDER, {
      name: Manager.collection.name,
    });
  }

  // Task 5
  private p_generate_osdb(): void {
    this.displayMessage(Msg.GENERATE_OSDB, {
      name: Manager.collection.name,
    });
  }

  // Task 6
  private p_download(): void {
    this.displayMessage(Msg.DOWNLOAD_FILES, {
      amount: this.condition.downloaded_beatmapset.toString(),
      total: Manager.collection.beatMapSets.size.toString(),
    });

    this.displayMessage(Msg.DOWNLOAD_LOG, {
      log: this.condition.download_log.join("\n"),
    });
  }
}

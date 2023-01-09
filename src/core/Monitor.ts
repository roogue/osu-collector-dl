import chalk from "chalk";
import { log, clear } from "console";
import { Constant } from "../struct/Constant";
import { Message, Msg } from "../struct/Message";
import OcdlError from "../struct/OcdlError";
import Util from "../util";
import Manager from "./Manager";

interface Condition {
  new_version: string;
  retry_input: boolean;
  retry_mode: boolean;
  fetched_collection: number;
  downloaded_beatmapset: number;
  download_log: string[];
}

export default class Monitor extends Manager {
  // Current version of the application
  readonly version: string;
  // Current progress of the application
  private progress = 0;
  // Console prompt for user input and freezing purpose
  private prompt = require("prompt-sync")({ sigint: true });
  // Object containing functions for each task
  private readonly task: Record<number, () => void>;

  readonly condition: Condition;

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

    this.version = (require("../../package.json")?.version ??
      "Unknown") as string; // Get current version from package.json

    // Set terminal title according to it's version
    Util.setTerminalTitle(`osu-collector-dl v${this.version}`);

    this.task = {
      0: () => {}, // Empty function
      1: this.p_input_id.bind(this), // Get Input id
      2: this.p_input_mode.bind(this), // Get Input mode
      3: this.p_fetch_collection.bind(this), // Fetch collection
      4: this.p_create_folder.bind(this), // Fetch collection v2
      5: this.p_generate_osdb.bind(this), // Generate osdb
      6: this.p_download.bind(this), // Download beatmapset
    };
  }

  update(): Monitor {
    clear();
    // If new version is available, display a message that notice the user
    if (this.condition.new_version) {
      log(
        chalk.yellow(
          new Message(Msg.NEW_VERSION, {
            version: this.condition.new_version,
            url: Constant.GithubReleaseUrl + this.condition.new_version,
          }).toString()
        )
      );
    }

    // Display the collection id and name, as well as the current working mode
    log(
      chalk.green(
        `Collection: ${Manager.collection.id} - ${Manager.collection.name} | Mode: ${Manager.config.mode}`
      )
    );

    // Display progress according to current task
    try {
      this.task[this.progress]();
    } catch (e) {
      throw new OcdlError("MESSAGE_GENERATOR_FAILED", e);
    }

    return this;
  }

  freeze(message: string, isErrored: boolean = false): void {
    // If errored, the message is in red, otherwise green
    log(isErrored ? chalk.red(message) : chalk.greenBright(message));

    // Freeze the console with prompt
    this.prompt(`Press "Enter" to ${isErrored ? "exit" : "continue"}.`);

    // End the whole process if it is errored
    if (isErrored) process.exit(1);
  }

  // Stop the console and wait for user input
  awaitInput(message: string, value?: any): string {
    return this.prompt(message + " ", value);
  }

  // To update the progress correspond to the current task
  next(): void {
    this.progress++;
  }

  setCondition(new_condition: Record<string, any>): void {
    Object.assign(this.condition, new_condition);
  }

  appendLog(log: string): void {
    this.condition.download_log.splice(0, 0, log);
    this.condition.download_log.splice(Manager.config.logSize, 1);
  }

  async checkNewVersion() {
    // Check for new version
    const newVersion = await Util.checkNewVersion(this.version);
    if (!newVersion) return;
    this.condition.new_version = newVersion;
  }

  // Task 1
  private p_input_id(): void {
    if (this.condition.retry_input) {
      log(chalk.red(new Message(Msg.INPUT_ID_ERR).toString()));
    }
  }

  // Task 2
  private p_input_mode(): void {
    if (this.condition.retry_mode) {
      log(chalk.red(new Message(Msg.INPUT_MODE_ERR).toString()));
    }
  }

  // Task 3
  private p_fetch_collection(): void {
    const beatmaps_length = Manager.collection.beatMapCount.toString();

    log(
      new Message(Msg.FETCH_DATA, {
        amount: this.condition.fetched_collection.toString(),
        total: beatmaps_length,
      }).toString()
    );
  }

  // Task 4
  private p_create_folder(): void {
    log(
      new Message(Msg.CREATE_FOLDER, {
        name: Manager.collection.name,
      }).toString()
    );
  }

  // Task 5
  private p_generate_osdb(): void {
    log(
      new Message(Msg.GENERATE_OSDB, {
        name: Manager.collection.name,
      }).toString()
    );
  }

  // Task 6
  private p_download(): void {
    log(
      new Message(Msg.DOWNLOAD_FILE, {
        amount: this.condition.downloaded_beatmapset.toString(),
        total: Manager.collection.beatMapSets.size.toString(),
      }).toString()
    );

    log(
      new Message(Msg.DOWNLOAD_LOG, {
        log: this.condition.download_log.join("\n"),
      }).toString()
    );
  }
}

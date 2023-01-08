import chalk from "chalk";
import { log, clear } from "console";
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
  readonly version: string;
  private progress = 0;
  private prompt = require("prompt-sync")({ sigint: true });
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

    this.task = {
      0: () => {}, // Empty function
      1: this.p_input_id.bind(this), // Input id
      2: this.p_input_mode.bind(this), // Input mode
      3: this.p_fetch_collection.bind(this), // Fetch collection
      4: this.p_create_folder.bind(this), // Fetch collection v2
      5: this.p_generate_osdb.bind(this), // Generate osdb
      6: this.p_download.bind(this), // Download beatmapset
    };
  }

  update(): Monitor {
    clear();
    // Header
    log(chalk.yellow(`osu-collector-dl v${this.version}`));

    if (this.condition.new_version) {
      log(
        chalk.yellow(
          new Message(Msg.NEW_VERSION, {
            version: this.condition.new_version,
            url: `https://github.com/roogue/osu-collector-dl/releases/tag/${this.condition.new_version}`,
          }).toString()
        )
      );
    }

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
    // Red color if errored, green if not
    log(isErrored ? chalk.red(message) : chalk.greenBright(message));

    // Freeze the console with prompt
    this.prompt(`Press "Enter" to ${isErrored ? "exit" : "continue"}.`);

    if (isErrored) process.exit(1);
  }

  awaitInput(message: string, value?: any): string {
    return this.prompt(message + " ", value); // Add space
  }

  // Keep progress on track
  next(): void {
    this.progress++;
  }

  setCondition(new_condition: Record<string, any>): void {
    Object.assign(this.condition, new_condition);
  }

  appendLog(log: string): void {
    this.condition.download_log.splice(0, 0, log);
    this.condition.download_log.splice(Manager.config.logLength, 1);
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

import chalk from "chalk";
import { log, clear } from "console";
import { config } from "../config";
import type { Collection } from "../struct/Collection";
import { Message, Msg } from "../struct/Message";
import OcdlError from "../struct/OcdlError";

interface Condition {
  mode: string;
  retry_input: boolean;
  retry_mode: boolean;
  fetched_collection: number;
  downloaded_beatmapset: number;
}

export default class Monitor {
  private readonly version: string;
  private progress = 0;
  private prompt = require("prompt-sync")({ sigint: true });
  private readonly task: Record<number, () => void>;

  readonly collection: Collection;

  readonly condition: Condition;

  constructor(collection: Collection) {
    this.collection = collection;

    this.condition = {
      mode: config.mode.toString(),
      retry_input: false,
      retry_mode: false,
      fetched_collection: 0,
      downloaded_beatmapset: 0,
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

  update(): void {
    if (1 != 1) clear();
    // Header
    log(chalk.yellow(`osu-collector-dl v${this.version}`));
    log(
      chalk.green(
        `Collection: ${this.collection.id} - ${this.collection.name} | Mode: ${this.condition.mode}`
      )
    );
    // Display progress according to current task
    try {
      this.task[this.progress]();
    } catch (e) {
      throw new OcdlError("MESSAGE_GENERATOR_FAILED", e);
    }
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
    const beatmaps_length = this.collection.beatMapCount.toString();

    log(
      new Message(Msg.FETCH_DATA, {
        amount: this.condition.fetched_collection.toString(),
        length: beatmaps_length,
      }).toString()
    );
  }

  // Task 4
  private p_create_folder(): void {
    log(
      new Message(Msg.CREATE_FOLDER, { name: this.collection.name }).toString()
    );
  }

  // Task 5
  private p_generate_osdb(): void {
    log(
      new Message(Msg.GENERATE_OSDB, { name: this.collection.name }).toString()
    );
  }

  // Task 5
  private p_download(): void {
    log(
      new Message(Msg.GENERATE_OSDB, {
        amount: this.condition.downloaded_beatmapset.toString(),
        total: this.collection.beatMapSets.size.toString(),
      }).toString()
    );
  }
}

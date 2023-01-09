import { existsSync, readFileSync } from "fs";
import { Collection } from "../struct/Collection";
import Config from "../struct/Config";

const filePath = Config.configFilePath;

export default class Manager {
  protected static collection = new Collection();
  protected static config = existsSync(filePath) // Check if the path to the config file exist
    ? new Config(readFileSync(filePath, "utf8")) // If present, read the config file
    : Config.generateConfig(); // If does not present, generate the config file
}

import { existsSync, readFileSync } from "fs";
import { Collection } from "../struct/Collection";
import Config from "../struct/Config";

const filePath = Config.configFilePath;

export default class Manager {
  protected static collection = new Collection();
  protected static config = existsSync(filePath)
    ? new Config(readFileSync(filePath, "utf8"))
    : Config.generateConfig();
}

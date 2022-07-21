import { existsSync, readFileSync } from "fs";
import Config from "./struct/Config";

const filePath = Config.configFilePath;

// If config file doesn't exist, create one
export const config: Config = existsSync(filePath)
  ? new Config(JSON.parse(readFileSync(filePath, "utf8")))
  : Config.generateConfig();

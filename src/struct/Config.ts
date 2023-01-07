import { existsSync, writeFileSync } from "fs";
import Logger from "../core/Logger";
import Util from "../util";
import OcdlError from "./OcdlError";

export default class Config {
  parallel: boolean;
  osuCollectorApiUrl: string;
  osuMirrorApiUrl: string;
  altOsuMirrorUrl: string;
  concurrency: number;
  directory: string;
  mode: number;
  logLength: number;
  static readonly configFilePath = "./config.json";

  constructor(contents?: string) {
    let config: Record<string, any> = {};
    if (contents) {
      try {
        config = JSON.parse(contents);
      } catch (e) {
        throw Logger.generateErrorLog(new OcdlError("INVALID_CONFIG", e));
      }
    }

    // Osucollector's base url
    this.osuCollectorApiUrl = "https://osucollector.com/api/collections/";

    // Osumirror's api url for download beatmap
    this.osuMirrorApiUrl = "https://api.chimu.moe/v1/download/";

    // alt Osu mirror url
    this.altOsuMirrorUrl = "https://kitsu.moe/api/d/";

    // The length of log when downloading beatmapsets
    this.logLength = 10;

    // Whether download process should be done in parallel
    this.parallel = Util.isBoolean(config.parallel) ? config.parallel : true;

    // How many urls should be downloaded in parallel at once
    this.concurrency = !isNaN(Number(config.concurrency))
      ? Number(config.concurrency)
      : 10;

    // Directory to save beatmaps
    this.directory = config.directory
      ? String(config.directory)
      : process.cwd();

    // Mode
    // 1: Download BeatmapSet
    // 2: Download BeatmapSet + Generate .osdb
    if (config.mode) {
      const mode = Number(config.mode);
      // Mode should be 1 or 2
      ![1, 2].includes(mode) ? (this.mode = 1) : (this.mode = mode);
    } else {
      this.mode = 1;
    }
  }

  static generateConfig(): Config {
    if (!Config.checkIfConfigFileExist()) {
      writeFileSync(
        Config.configFilePath,
        JSON.stringify({
          parallel: true,
          concurrency: 5,
          directory: process.cwd(),
          mode: 1,
        })
      );
    }
    return new Config();
  }

  private static checkIfConfigFileExist(): boolean {
    return existsSync(Config.configFilePath);
  }
}

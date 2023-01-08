import { existsSync, writeFileSync } from "fs";
import path from "path";
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
    this.logLength = !isNaN(Number(config.logSize))
      ? Number(config.logSize)
      : 15;

    // Whether download process should be done in parallel
    this.parallel = Util.isBoolean(config.parallel) ? config.parallel : true;

    // How many urls should be downloaded in parallel at once
    this.concurrency = !isNaN(Number(config.concurrency))
      ? Number(config.concurrency)
      : 10;

    // Directory to save beatmaps
    this.directory = this.getPath(config.directory);

    // Mode
    // 1: Download BeatmapSet
    // 2: Download BeatmapSet + Generate .osdb
    this.mode = this.getMode(config.mode);
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

  private getMode(data: any): number {
    return data == 1 ? 1 : data == 2 ? 2 : 1;
  }

  private getPath(data: any): string {
    if (typeof data !== "string") return process.cwd();
    return path.isAbsolute(data) ? data : process.cwd();
  }
}

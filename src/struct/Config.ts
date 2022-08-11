import { existsSync, writeFileSync } from "fs";
import Util from "../util";

export default class Config {
  parallel: boolean;
  osuCollectorApiUrl: string;
  osuMirrorApiUrl: string;
  altOsuMirrorUrl: string;
  dl_impulse_rate: number;
  directory: string;
  mode: number;
  static readonly configFilePath = "./config.json";

  constructor(object?: Record<string, any>) {
    // Osucollector's base url
    this.osuCollectorApiUrl = "https://osucollector.com/api/collections/";

    // Osumirror's api url for download beatmap
    this.osuMirrorApiUrl = "https://api.chimu.moe/v1/download/";

    this.altOsuMirrorUrl = "https://kitsu.moe/api/d/";

    // Whether download process should be done in parallel
    this.parallel = Util.isBoolean(object?.parallel) ? object!.parallel : true;

    // How many urls should be downloaded in parallel at once
    this.dl_impulse_rate = !isNaN(Number(object?.dl_impulse_rate))
      ? Number(object!.dl_impulse_rate)
      : 10;

    // Directory to save beatmaps
    this.directory = object?.directory
      ? String(object?.directory)
      : process.cwd();

    // Mode
    // 1: Download BeatmapSet
    // 2: Download BeatmapSet + Generate .osdb
    if (object?.mode) {
      const mode = Number(object.mode);
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
          dl_impulse_rate: 10,
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

import { existsSync, writeFileSync } from "fs";

export default class Config {
  parallel: boolean;
  osuCollector_url: string;
  osuMirror_url: string;
  dl_impulse_rate: number;
  directory: string;
  static readonly configFilePath = "./config.json";

  constructor(object?: Record<string, any>) {
    // Osucollector's base url
    this.osuCollector_url = "https://osucollector.com/";

    // Osumirror's api url for download beatmap
    this.osuMirror_url = "https://api.chimu.moe/v1/";

    // Whether download process should be done in parallel
    this.parallel = object?.parallel ?? true;

    // How many urls should be downloaded in parallel at once
    this.dl_impulse_rate = object?.dl_impulse_rate ?? 10;

    // Directory to save beatmaps
    this.directory = object?.directory ?? process.cwd();
  }

  static generateConfig(): Config {
    if (!Config.checkIfConfigFileExist()) {
      writeFileSync(
        Config.configFilePath,
        JSON.stringify({
          parallel: true,
          dl_impulse_rate: 10,
          directory: process.cwd(),
        })
      );
    }
    return new Config();
  }

  private static checkIfConfigFileExist(): boolean {
    return existsSync(Config.configFilePath);
  }
}

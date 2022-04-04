import { Main } from "../struct/Main";
import osu from "node-osu";
import { config } from "../../config";
import { DownloadManager } from "../struct/DownloadManager";

const url = 3563;

(async () => {
  //   const api = new osu.Api(config.api_key, { notFoundAsError: false });
  //   console.log(await Promise.all([api.getBeatmaps({ b: "3478325" })]));
  const main = new Main(url, { parallel: true });
  await main.download();
})();

//https://osu.ppy.sh/beatmapsets/476695/download

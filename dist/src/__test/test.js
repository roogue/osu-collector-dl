"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Main_1 = require("../struct/Main");
const url = 3563;
(async () => {
    //   const api = new osu.Api(config.api_key, { notFoundAsError: false });
    //   console.log(await Promise.all([api.getBeatmaps({ b: "3478325" })]));
    const main = new Main_1.Main(url, { parallel: true });
    await main.download();
})();
//https://osu.ppy.sh/beatmapsets/476695/download
//# sourceMappingURL=test.js.map
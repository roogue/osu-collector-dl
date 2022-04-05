"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Main_1 = require("./struct/Main");
const config_1 = require("../config");
(async () => {
    const prompt = require("prompt-sync")({ sigint: true });
    const id = prompt("Please Enter An ID: ");
    const main = new Main_1.Main(id, { parallel: config_1.config.parallel });
    await main.download();
})();
//# sourceMappingURL=index.js.map
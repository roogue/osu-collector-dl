import { Main } from "./struct/Main";
import { config } from "./config";

(async () => {
  const prompt = require("prompt-sync")({ sigint: true });
  const id = prompt("Please Enter An ID: ");

  const main = new Main(id, {
    parallel: config.parallel,
    path: config.directory,
  });
  await main.download();
})();

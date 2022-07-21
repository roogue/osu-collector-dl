import Main from "./core/Main";
import { config } from "./config";

(async () => {
  const prompt = require("prompt-sync")({ sigint: true });
  const id = prompt("Please Enter An ID: ");

  const main = new Main(id, config);

  await main.run();
})();

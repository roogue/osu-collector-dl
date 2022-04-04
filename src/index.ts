import { Main } from "./struct/Main";
import { config } from "../config";

(async () => {
  const main = new Main(config.id, { parallel: config.parallel });
  await main.download();
})();

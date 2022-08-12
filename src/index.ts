import Main from "./core/Main";
import { config } from "./config";
import Logger from "./core/Logger";
import OcdlError from "./struct/OcdlError";

// Prompt user for id and mode
const prompt = require("prompt-sync")({ sigint: true });

const getId = (): number | null => {
  const id: number = Number(prompt("Please Enter An ID: "));
  if (isNaN(id)) {
    console.log("Invalid ID, please try again.");
    return null;
  }
  return id;
};

const getMode = (): number | null => {
  const mode: string = String(
    prompt(
      `Generate .osdb file? (y/n) - Default(${
        config.mode === 2 ? "Yes" : "No"
      }): `
    )
  ).toLowerCase();
  // Select default mode if user doesn't enter anything
  if (!mode) return config.mode;
  // Check if user entered valid mode
  if (["n", "no", "1"].includes(mode)) return 1;
  if (["y", "yes", "ass", "2"].includes(mode)) return 2;

  console.log('Invalid mode, please type "y" or "n".');
  return null;
};

(async () => {
  // Get version from package.json
  const version = (require("../package.json")?.version ?? "Unknown") as string;
  console.log(`=== osu-collector-dl v${version} ===`);

  let id: number | null = null;
  let mode: number | null = null;

  try {
    // Get id
    while (id === null) {
      id = getId();
    }

    // Get mode
    while (mode === null) {
      mode = getMode();
    }

    config.mode = mode;
  } catch (e) {
    Logger.generateErrorLog(new OcdlError("GET_USER_INPUT_FAILED", e));
    return;
  }

  const main = new Main(id, config);
  await main.run();
})();

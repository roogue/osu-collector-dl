import Main from "./core/Main";
import { config } from "./config";
import Logger from "./core/Logger";
import OcdlError from "./struct/OcdlError";
import Monitor from "./core/Monitor";
import { Message, Msg } from "./struct/Message";
import { Collection } from "./struct/Collection";

const isOnline = async (): Promise<boolean> => {
  return !!(await require("dns")
    .promises.resolve("google.com")
    .catch(() => {}));
};

// Script Starts Here
(async () => {
  // Initiate monitor
  const collection = new Collection();
  const monitor = new Monitor(collection);
  monitor.update();

  // Check if internet connection is presence
  const onlineStatus = await isOnline();
  if (!onlineStatus)
    return monitor.freeze(new Message(Msg.NO_CONNECTION).toString(), true);

  let id: number | null = null;
  let mode: number | null = null;

  try {
    // task 1
    monitor.next();

    // Get id
    while (id === null) {
      monitor.update();

      const result = Number(
        monitor.awaitInput(new Message(Msg.INPUT_ID).toString(), "none")
      );
      isNaN(result) ? (monitor.condition.retry_input = true) : (id = result); // check if result is valid
    }

    monitor.collection.id = id;

    // task 2
    monitor.next();

    // Get mode
    while (mode === null) {
      monitor.update();
      const result = String(
        monitor.awaitInput(
          new Message(Msg.INPUT_MODE, {
            mode: config.mode === 2 ? "Yes" : "No",
          }).toString(),
          config.mode.toString()
        )
      );
      if (["n", "no", "1"].includes(result)) mode = 1;
      if (["y", "yes", "ass", "2"].includes(result)) mode = 2;
      if (mode === null) monitor.condition.retry_mode = true;
    }

    monitor.setCondition({ mode: mode.toString() });
    config.mode = mode;
  } catch (e) {
    Logger.generateErrorLog(new OcdlError("GET_USER_INPUT_FAILED", e));
    return;
  }

  const main = new Main(monitor);

  try {
    await main.run();
  } catch (e) {
    console.error(e);
    if (e instanceof OcdlError) return Logger.generateErrorLog(e);
  }
})();

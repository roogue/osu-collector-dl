import Worker from "./core/Worker";
import Logger from "./core/Logger";
import OcdlError from "./struct/OcdlError";

// Script Starts Here
void (async () => {
  const worker = new Worker();

  try {
    await worker.run();
  } catch (e) {
    if (e instanceof OcdlError) Logger.generateErrorLog(e);
    worker.monitor.freeze("An error occurred: " + String(e), true);
  }
})();

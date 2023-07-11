import Worker from "./core/Worker";
import Logger from "./core/Logger";
import OcdlError from "./struct/OcdlError";
import { Msg } from "./struct/Message";

// Script Starts Here
void (async () => {
  const worker = new Worker();

  try {
    await worker.run();
  } catch (err) {
    if (err instanceof OcdlError) {
      Logger.generateErrorLog(err);
    }
    worker.monitor.freeze(Msg.PROCESS_ERRORED, { error: String(err) }, true);
  }
})();

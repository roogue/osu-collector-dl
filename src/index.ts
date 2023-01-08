import Main from "./core/Worker";
import Logger from "./core/Logger";
import OcdlError from "./struct/OcdlError";

// Script Starts Here
(async () => {
  const main = new Main();

  try {
    await main.run();
  } catch (e) {
    if (e instanceof OcdlError) Logger.generateErrorLog(e);
    main.monitor.freeze("An error occurred: " + e, true);
  }
})();

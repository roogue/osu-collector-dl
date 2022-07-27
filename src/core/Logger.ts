import type OcdlError from "../struct/OcdlError";
import { existsSync, writeFileSync, appendFileSync } from "fs";
import _path from "path";

export default class Logger {
  static readonly errorLogPath = "./ocdl-error.log";
  static readonly missingLogPath = "./ocdl-missing.log";

  static async stayAliveLog(message: string) {
    console.error(message);
    await new Promise((res) => setTimeout(res, 5000)); // Sleep for 5 seconds before closing console
    throw new Error();
  }

  static generateErrorLog(error: OcdlError): boolean {
    try {
      if (!Logger.checkIfErrorLogFileExists()) {
        writeFileSync(
          Logger.errorLogPath,
          `=== Error Log ===\n${error.stack}\n=========\n`
        );
      } else {
        appendFileSync(
          Logger.errorLogPath,
          `${error.stack}\n=================\n`
        );
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  private static checkIfErrorLogFileExists(): boolean {
    return existsSync(Logger.errorLogPath);
  }

  static generateMissingLog(folder: string, url: string): boolean {
    const path = _path.join(folder, Logger.missingLogPath);

    try {
      if (!existsSync(path)) {
        writeFileSync(path, `=== Missing Log ===\n${url}\n`);
      } else {
        appendFileSync(path, `${url}\n`);
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

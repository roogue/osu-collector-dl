import type OcdlError from "../struct/OcdlError";
import { existsSync, writeFileSync, appendFileSync } from "fs";

export default class Logger {
  static readonly errorLogPath = "./ocdl-error.log";

  static async stayAliveLog(message: string) {
    console.error(message);
    await new Promise((res) => setTimeout(res, 5000)); // Sleep for 5 seconds before closing console
    throw new Error();
  }

  static generateErrorLog(error: OcdlError): boolean {
    try {
      if (!Logger.checkIfLogFileExists()) {
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

  private static checkIfLogFileExists(): boolean {
    return existsSync(Logger.errorLogPath);
  }
}

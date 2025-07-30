import https from "https";
import { Constant } from "./struct/Constant";

export default class Util {
  static isBoolean(obj: unknown): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[\\/<>:"|?*]+/g;
    return str.replace(regex, "");
  }

  static async isOnline(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = https.get(Constant.OsuCollectorApiUrl, () => {
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  static checkUndefined(
    obj: Record<string, unknown>,
    fields: string[]
  ): string | null {
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(obj, field)) {
        return field;
      }
    }
    return null;
  }

  static checkRange(number: number, start: number, end: number): boolean {
    return !(number < start || number > end);
  }

  static setTerminalTitle(title: string) {
    process.stdout.write(
      String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
    );
  }
}

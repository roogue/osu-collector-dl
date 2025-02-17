import dns from "dns";

export default class Util {
  static isBoolean(obj: unknown): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[\\/<>:"|?*]+/g;
    return str.replace(regex, "");
  }

  static async isOnline(): Promise<boolean> {
    return !!(await dns.promises.resolve("google.com").catch(() => false));
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

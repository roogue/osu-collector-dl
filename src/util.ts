export default class Util {
  static isBoolean(obj: any): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[\\\/<>:"\|?*]+/g;
    return str.replace(regex, "");
  }

  static checkUndefined(obj: Record<string, any>): string | null {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) return key;
    }
    return null;
  }
}

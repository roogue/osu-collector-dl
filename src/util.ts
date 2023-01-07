export default class Util {
  static isBoolean(obj: any): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[\\\/<>:"\|?*]+/g;
    return str.replace(regex, "");
  }

  static checkUndefined(
    obj: Record<string, any>,
    fields: string[]
  ): string | null {
    for (const field of fields) {
      if (!obj.hasOwnProperty(field)) {
        return field;
      }
    }
    return null;
  }
}

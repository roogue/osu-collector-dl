export default class Util {
  static isBoolean(obj: any): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[ \/<>:"\|?*]+/g;
    return str.replace(regex, "");
  }
}

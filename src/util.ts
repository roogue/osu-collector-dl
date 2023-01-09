import { request } from "undici";
import { Constant } from "./struct/Constant";

export default class Util {
  static isBoolean(obj: any): boolean {
    return !!obj === obj;
  }

  static replaceForbiddenChars(str: string): string {
    const regex = /[\\\/<>:"\|?*]+/g;
    return str.replace(regex, "");
  }

  static async isOnline(): Promise<boolean> {
    return !!(await require("dns")
      .promises.resolve("google.com")
      .catch(() => {}));
  }

  static async checkNewVersion(
    current_version: string
  ): Promise<string | null> {
    if (current_version === "Unknown") return null;
    const res = await request(Constant.GithubReleaseApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": `osu-collector-dl/v${current_version}`,
      },
      query: {
        per_page: 1,
      },
    }).catch(() => null);

    if (!res || res.statusCode !== 200) return null;
    const data = (await res.body.json().catch(() => null)) as
      | Record<string, any>[]
      | null;
    if (!data) return null;

    // Check version
    const version = data[0].tag_name as string;
    if (version === "v" + current_version) return null;

    return version;
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

  static setTerminalTitle(title: string) {
    process.stdout.write(
      String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
    );
  }
}

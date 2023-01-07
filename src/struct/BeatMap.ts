import type { BeatMapType } from "../types";
import Util from "../util";
import OcdlError from "./OcdlError";

export class BeatMap {
  // compulsory
  id: number;
  checksum: string;

  // nullable
  version?: string;
  mode?: number;
  difficulty_rating?: number;

  constructor(jsonData: Record<string, any>) {
    const und = Util.checkUndefined(jsonData, ["id", "checksum"]);
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    const { id, checksum } = jsonData as BeatMapType;

    this.id = id;
    this.checksum = checksum;
  }
}

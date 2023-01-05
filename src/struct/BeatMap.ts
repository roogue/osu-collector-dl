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
    const { id, checksum } = jsonData;
    const und = Util.checkUndefined({ id, checksum });
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    this.id = id;
    this.checksum = checksum;
  }
}

import { v1ResBeatMapType } from "../core/Requestor";
import type { Json } from "../types";
import Util from "../util";
import OcdlError from "./OcdlError";

export type BeatMapId = number;

export class BeatMap {
  // Compulsory property
  id: BeatMapId;
  checksum: string;

  // Nullable property
  version?: string;
  mode?: number;
  difficulty_rating?: number;

  constructor(jsonData: Json) {
    // Check if required fields are present in the JSON response
    const und = Util.checkUndefined(jsonData, ["id", "checksum"]);
    if (und) {
      throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
    }

    const { id, checksum } = jsonData as v1ResBeatMapType;

    this.id = id;
    this.checksum = checksum;
  }
}

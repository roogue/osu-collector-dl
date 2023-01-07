import type { BeatMapSetType, BeatMapType } from "../types";
import Util from "../util";
import { BeatMap } from "./BeatMap";
import OcdlError from "./OcdlError";

export class BeatMapSet {
  // compulsory
  id: number;
  beatMaps: Map<number, BeatMap>;

  // nullable
  title?: string;
  artist?: string;

  constructor(jsonData: Record<string, any>) {
    const und = Util.checkUndefined(jsonData, ["id", "beatmaps"]);
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    const { id, beatmaps } = jsonData as BeatMapSetType;

    this.id = id;
    this.beatMaps = this._resolveBeatMaps(beatmaps);
  }

  private _resolveBeatMaps(beatMapJson: BeatMapType[]) {
    const resolvedData = new Map<number, BeatMap>();
    for (let i = 0; i < beatMapJson.length; i++) {
      try {
        const map = new BeatMap(beatMapJson[i]);
        resolvedData.set(map.id, map);
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }
    return resolvedData;
  }
}

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

  private _resolveBeatMaps(beatMapJson: BeatMapType[]): Map<number, BeatMap> {
    return beatMapJson.reduce((acc, current) => {
      try {
        const map = new BeatMap(current);
        acc.set(map.id, map);
        return acc;
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }, new Map<number, BeatMap>());
  }
}

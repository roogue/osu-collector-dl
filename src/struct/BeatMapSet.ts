import Util from "../util";
import { BeatMap } from "./BeatMap";
import OcdlError from "./OcdlError";

export class BeatMapSet {
  // compulsory
  id: number;
  beatMaps: Map<number, BeatMap>;

  // nullable
  title?: string
  artist?: string

  constructor(jsonData: Record<string, any>) {
    const { id, beatmaps } = jsonData;
    const und = Util.checkUndefined({ id, beatmaps });
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    this.id = id;
    this.beatMaps = this._resolveBeatMaps(beatmaps);
  }

  private _resolveBeatMaps(array: Record<number, any>[]) {
    const resolvedData = new Map<number, BeatMap>();
    const unresolvedData = array;
    for (let i = 0; i < unresolvedData.length; i++) {
      try {
        const map = new BeatMap(unresolvedData[i]);
        resolvedData.set(map.id, map);
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }
    return resolvedData;
  }
}

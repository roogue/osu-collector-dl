import OcdlError from "./OcdlError";
import { BeatMapSet } from "./BeatMapSet";
import Util from "../util";
import { ModeByte } from "../types";

export class Collection {
  beatMapSets: Map<number, BeatMapSet> = new Map();
  beatMapCount: number = 0;
  id: number = 0;
  name: string = "Unknown";
  uploader: {
    username: string;
  } = {
    username: "Unknown",
  };

  constructor() {}

  resolveData(jsonData: Record<string, any> = {}) {
    const { id, name, uploader, beatmapsets, beatmapCount } = jsonData;
    const und = Util.checkUndefined({
      id,
      name,
      uploader,
      beatmapsets,
      beatmapCount,
    });
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    this.id = id;
    this.name = name;
    this.uploader = uploader;
    this.beatMapSets = this._resolveBeatMapSets(beatmapsets);
    this.beatMapCount = beatmapCount;
  }

  resolveFullData(array: Record<string, any>[]): void {
    const unresolvedData = array;
    if (!unresolvedData.length)
      throw new OcdlError("CORRUPTED_RESPONSE", "No beatmap found");

    for (let i = 0; i < unresolvedData.length; i++) {
      const { id, mode, difficulty_rating, version, beatmapset } = array[i];
      const und = Util.checkUndefined({
        id,
        mode,
        difficulty_rating,
        version,
        beatmapset,
      });
      if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

      const beatMapSet = this.beatMapSets.get(beatmapset.id);
      if (!beatMapSet) continue;

      const { title, artist } = beatmapset;

      beatMapSet.title = title;
      beatMapSet.artist = artist;

      const beatMap = beatMapSet.beatMaps.get(id);
      if (!beatMap) continue;

      beatMap.difficulty_rating = difficulty_rating;
      beatMap.mode = +ModeByte[mode];
      beatMap.version = version;
    }
  }

  private _resolveBeatMapSets(
    array: Record<string, any>[]
  ): Map<number, BeatMapSet> {
    const resolvedData = new Map<number, BeatMapSet>();
    const unresolvedData = array;
    if (!unresolvedData.length)
      throw new OcdlError("CORRUPTED_RESPONSE", "No beatmapset found");

    for (let i = 0; i < unresolvedData.length; i++) {
      try {
        const set = new BeatMapSet(unresolvedData[i]);
        resolvedData.set(set.id, set);
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }
    return resolvedData;
  }
}

import OcdlError from "./OcdlError";
import { BeatMapSet } from "./BeatMapSet";
import Util from "../util";
import {
  BeatMapSetType,
  CollectionType,
  FullBeatMapType,
  ModeByte,
} from "../types";

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

  resolveData(jsonData: Record<string, any> = {}) {
    const und = Util.checkUndefined(jsonData, [
      "id",
      "name",
      "uploader",
      "beatmapsets",
      "beatmapCount",
    ]);
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    const { id, name, uploader, beatmapsets, beatmapCount } =
      jsonData as CollectionType;

    this.id = id;
    this.name = name;
    this.uploader = uploader;
    this.beatMapSets = this._resolveBeatMapSets(beatmapsets);
    this.beatMapCount = beatmapCount;
  }

  getReplacedName(): string {
    return Util.replaceForbiddenChars(this.name);
  }

  resolveFullData(jsonData: Record<string, any>[]): void {
    if (!jsonData.length)
      throw new OcdlError("CORRUPTED_RESPONSE", "No beatmap found");

    for (let i = 0; i < jsonData.length; i++) {
      const und = Util.checkUndefined(jsonData[i], [
        "id",
        "mode",
        "difficulty_rating",
        "version",
        "beatmapset",
      ]);
      if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

      const { id, mode, difficulty_rating, version, beatmapset } = jsonData[
        i
      ] as FullBeatMapType;

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
    beatMapSetJson: BeatMapSetType[]
  ): Map<number, BeatMapSet> {
    return beatMapSetJson.reduce((acc, current) => {
      try {
        const map = new BeatMapSet(current);
        acc.set(map.id, map);
        return acc;
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }, new Map<number, BeatMapSet>());
  }
}

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

  // Populates the Collection instance with data from the given jsonData object
  resolveData(jsonData: Record<string, any> = {}) {
    // Check for required fields in the jsonData object
    const und = Util.checkUndefined(jsonData, [
      "id",
      "name",
      "uploader",
      "beatmapsets",
      "beatmapCount",
    ]);
    // Throw an OcdlError if a required field is not present in the jsonData object
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    const { id, name, uploader, beatmapsets, beatmapCount } =
      jsonData as CollectionType;

    this.id = id;
    this.name = name;
    this.uploader = uploader;
    this.beatMapSets = this._resolveBeatMapSets(beatmapsets);
    this.beatMapCount = beatmapCount;
  }

  // Returns a sanitized version of the Collection's name with any forbidden characters replaced
  getReplacedName(): string {
    return Util.replaceForbiddenChars(this.name);
  }

  // Populates the beatMapSet and beatMap instances within the Collection with data from the given jsonData array
  resolveFullData(jsonData: Record<string, any>[]): void {
    // Throw an OcdlError if the jsonData array is empty
    if (!jsonData.length)
      throw new OcdlError("CORRUPTED_RESPONSE", "No beatmap found");

    // Iterate through each element in the jsonData array
    for (let i = 0; i < jsonData.length; i++) {
      // Check for required fields in the current element of the jsonData array
      const und = Util.checkUndefined(jsonData[i], [
        "id",
        "mode",
        "difficulty_rating",
        "version",
        "beatmapset",
      ]);
      // Throw an OcdlError if a required field is not present in the current element of the jsonData array
      if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

      const { id, mode, difficulty_rating, version, beatmapset } = jsonData[
        i
      ] as FullBeatMapType;

      const beatMapSet = this.beatMapSets.get(beatmapset.id);
      // Continue to the next iteration if the BeatMapSet instance was not found
      if (!beatMapSet) continue;

      const { title, artist } = beatmapset;

      beatMapSet.title = title;
      beatMapSet.artist = artist;

      const beatMap = beatMapSet.beatMaps.get(id);
      // Continue to the next iteration if the beatMap instance was not found
      if (!beatMap) continue;

      beatMap.difficulty_rating = difficulty_rating;
      // Convert the mode field from a string to a number using the ModeByte object
      beatMap.mode = +ModeByte[mode];
      beatMap.version = version;
    }
  }

  // Returns a Map of beatmap set id to BeatMapSet instance, constructed from the given beatMapSetJson array
  private _resolveBeatMapSets(
    beatMapSetJson: BeatMapSetType[]
  ): Map<number, BeatMapSet> {
    // Reduce the beatMapSetJson array to a Map, adding a new entry for each element in the array
    return beatMapSetJson.reduce((acc, current) => {
      try {
        const map = new BeatMapSet(current);
        // Add an entry to the Map with the id of the BeatMapSet instance as the key and the instance as the value
        acc.set(map.id, map);
        return acc;
      } catch (e) {
        throw new OcdlError("CORRUPTED_RESPONSE", e);
      }
    }, new Map<number, BeatMapSet>());
  }
}

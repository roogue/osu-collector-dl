import OcdlError from "./OcdlError";
import { BeatMapSet, BeatMapSetId } from "./BeatMapSet";
import Util from "../util";
import { Json, ModeByte } from "../types";
import {
  v1ResBeatMapSetType,
  v1ResCollectionType,
  v2ResBeatMapType,
} from "../core/Requestor";

export type CollectionId = number;

export class Collection {
  beatMapSets: Map<BeatMapSetId, BeatMapSet> = new Map();
  beatMapCount = 0;
  id: CollectionId = 0;
  name = "Unknown";
  uploader: {
    username: string;
  } = {
    username: "Unknown",
  };

  // Populates the Collection instance with data from the given jsonData object
  resolveData(jsonData: Json = {}) {
    // Check for required fields in the jsonData object
    const und = Util.checkUndefined(jsonData, [
      "id",
      "name",
      "uploader",
      "beatmapsets",
    ]);
    // Throw an OcdlError if a required field is not present in the jsonData object
    if (und) {
      throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
    }

    const { id, name, uploader, beatmapsets } = jsonData as v1ResCollectionType;

    this.id = id;
    this.name = name;
    this.uploader = uploader;
    this.beatMapSets = this._resolveBeatMapSets(beatmapsets);
    this.beatMapCount = this._getBeatMapCount(beatmapsets);
  }

  // Returns a sanitized version of the Collection's name with any forbidden characters replaced
  getReplacedName(): string {
    return Util.replaceForbiddenChars(this.name);
  }

  // Populates the beatMapSet and beatMap instances within the Collection with data from the given data array
  resolveFullData(jsonBeatMaps: v2ResBeatMapType[]): void {
    // Throw an OcdlError if the data array is empty
    if (!jsonBeatMaps.length) {
      throw new OcdlError("CORRUPTED_RESPONSE", "No beatmap found");
    }

    // Iterate through each element in the data array
    for (const data of jsonBeatMaps) {
      // Check for required fields in the current element of the data array
      const und = Util.checkUndefined(data, [
        "id",
        "mode",
        "difficulty_rating",
        "version",
        "beatmapset",
      ]);
      // Throw an OcdlError if a required field is not present in the current element of the data array
      if (und) {
        throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);
      }

      const { id, mode, difficulty_rating, version, beatmapset } = data;

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
    jsonBeatMapSets: v1ResBeatMapSetType[]
  ): Map<number, BeatMapSet> {
    // Reduce the beatMapSetJson array to a Map, adding a new entry for each element in the array
    return jsonBeatMapSets.reduce((acc, current) => {
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

  // Reduce the beatMapSetJson array to the number of beatmaps.
  // This alternative method is used because the response from osu!Collector API is not always accurate
  private _getBeatMapCount(jsonBeatMapSets: v1ResBeatMapSetType[]): number {
    return jsonBeatMapSets.reduce((acc, current) => {
      const length = current.beatmaps.length;
      return acc + length;
    }, 0);
  }
}

import type { Json, v1ResBeatMapSetType, v1ResBeatMapType } from "../types";
import Util from "../util";
import { BeatMap } from "./BeatMap";
import OcdlError from "./OcdlError";

export class BeatMapSet {
  // Compulsory property
  id: number;
  beatMaps: Map<number, BeatMap>;

  // Nullable property
  title?: string;
  artist?: string;

  constructor(jsonData: Json) {
    // Check if required fields are present in the JSON response
    const und = Util.checkUndefined(jsonData, ["id", "beatmaps"]);
    if (und) throw new OcdlError("CORRUPTED_RESPONSE", `${und} is required`);

    // Destructure the JSON data and assign to object properties
    const { id, beatmaps } = jsonData as v1ResBeatMapSetType;
    this.id = id;
    this.beatMaps = this._resolveBeatMaps(beatmaps);
  }

  // Returns the title with forbidden characters replaced, or null if title is not present
  getReplacedName(): string | null {
    if (!this.title) return null;
    return Util.replaceForbiddenChars(this.title);
  }

  // Helper function to create a Map of beatmap IDs to BeatMap objects from JSON data
  private _resolveBeatMaps(
    jsonBeatMaps: v1ResBeatMapType[]
  ): Map<number, BeatMap> {
    return jsonBeatMaps.reduce((acc, current) => {
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

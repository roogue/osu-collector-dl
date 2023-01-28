// * These typings are incomplete, but they are enough to get the app working.
// * Reference: https://github.com/roogue/osu-collector-node/blob/main/src/typings/Collection.ts

// Basic Json Interface
interface Json {
  [x: string]: JsonValues;
}
type JsonValues = string | number | boolean | Date | Json | JsonArray;
type JsonArray = Array<string | number | boolean | Date | Json | JsonArray>;

// Basic collection data types
export interface v1ResCollectionType extends Json {
  beatmapIds: v1ResBeatMapType[];
  beatmapsets: v1ResBeatMapSetType[];
  id: number;
  name: string;
  uploader: {
    username: string;
  };
}
export interface v1ResBeatMapSetType extends Json {
  beatmaps: v1ResBeatMapType[];
  id: number;
}
export interface v1ResBeatMapType extends Json {
  checksum: string;
  id: number;
}

// Full collection data types
export interface v2ResCollectionType extends Json {
  hasMore: boolean;
  nextPageCursor: number;
  beatmaps: v2ResBeatMapType[];
}
export interface v2ResBeatMapType extends Json {
  id: number;
  mode: Mode;
  difficulty_rating: number;
  version: string;
  beatmapset: v2ResBeatMapSetType;
}
export interface v2ResBeatMapSetType extends Json {
  id: number;
  title: string;
  artist: string;
}

export type Mode = "taiko" | "osu" | "fruits" | "mania";
export enum ModeByte {
  "osu" = 0,
  "taiko" = 1,
  "fruits" = 2,
  "mania" = 3,
}

export type Cursors = number[];

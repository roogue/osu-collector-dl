// * These typings are incomplete, but they are enough to get the app working.
// * Reference: https://github.com/roogue/osu-collector-node/blob/main/src/typings/Collection.ts
export interface BeatMapType {
  checksum: string;
  id: number;
}
export interface BeatMapSetType {
  beatmaps: BeatMapType[];
  id: number;
}

export interface CollectionType {
  beatmapIds: BeatMapType[];
  beatmapsets: BeatMapSetType[];
  beatmapCount: number;
  id: number;
  name: string;
  uploader: {
    username: string;
  };
}

export interface FullBeatMapType {
  id: number;
  mode: Mode;
  difficulty_rating: number;
  version: string;
  beatmapset: FullBeatMapSetType;
}

export interface FullBeatMapSetType {
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

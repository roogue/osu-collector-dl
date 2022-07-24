export interface BeatMap {
  checksum: string;
  id: number;
}
export interface BeatMapSet {
  beatmaps: BeatMap[];
  id: number;
}

export interface Collection {
  beatmapIds: BeatMap[];
  beatmapsets: BeatMapSet[];
  beatmapCount: number;
  id: number;
  name: string;
  uploader: {
    username: string;
  };
}

export interface BeatMapV2 {
  checksum: string;
  id: number;
  beatmapset_id: number;
  beatmapset: BeatMapSetV2;
  version: string;
  mode: Mode;
  difficulty_rating: number;
}

export interface BeatMapSetV2 {
  artist: string;
  title: string;
  creator: string;
}

export interface BeatMapV2ResData {
  nextPageCursor: number;
  hasMore: boolean;
  beatmaps: BeatMapV2[];
}

export type Mode = "taiko" | "osu" | "fruits" | "mania";

export enum ModeByte {
  "osu" = 0,
  "taiko" = 1,
  "fruits" = 2,
  "mania" = 3,
}

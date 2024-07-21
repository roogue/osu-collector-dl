import { Response, fetch, request } from "undici";
import { Constant } from "../struct/Constant";
import { Cursors, Json, Mode } from "../types";
import OcdlError from "../struct/OcdlError";
import { CollectionId } from "../struct/Collection";

interface FetchCollectionQuery {
  perPage?: number;
  cursor?: number;
}

interface fetchCursorsQuery {
  id: CollectionId;
}

interface DownloadCollectionOptions {
  alternative: boolean;
}

interface FetchCollectionOptions {
  v2: boolean;
  cursor?: number;
}

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

export class Requestor {
  static async fetchDownloadCollection(
    id: CollectionId,
    options: DownloadCollectionOptions = {
      alternative: true,
    }
  ): Promise<Response> {
    const url =
      (options.alternative
        ? Constant.OsuMirrorAltApiUrl
        : Constant.OsuMirrorApiUrl) + id.toString();

    const res = await fetch(url, { method: "GET" });

    return res;
  }

  static async fetchCollection(
    id: CollectionId,
    options: FetchCollectionOptions = { v2: false }
  ): Promise<Json> {
    const { v2, cursor } = options;
    // Use different endpoint for different version of api request
    const url =
      Constant.OsuCollectorApiUrl + id.toString() + (v2 ? "/beatmapsV2" : "");

    const query: FetchCollectionQuery = // Query is needed for V2 collection
      v2
        ? {
            perPage: 100,
            cursor, // Cursor which point to the next page
          }
        : {};

    const data = await request(url, { method: "GET", query })
      .then(async (res) => {
        if (res.statusCode !== 200) {
          throw `Status code: ${res.statusCode}`;
        }

        return (await res.body.json()) as Json;
      })
      .catch((e: unknown) => {
        return new OcdlError("REQUEST_DATA_FAILED", e);
      });

    if (data instanceof OcdlError) {
      throw data;
    }

    return data;
  }

  static async fetchCursors(id: CollectionId): Promise<Cursors> {
    const url = Constant.OsuCollectorDbApiUrl;
    const query: fetchCursorsQuery = { id };

    const data = await request(url, {
      method: "GET",
      query,
      headersTimeout: 5e3, // Set 5 Seconds Timeout
    })
      .then(async (res) => {
        if (res.statusCode !== 200) {
          throw `Status code: ${res.statusCode}`;
        }

        return (await res.body.json()) as Cursors;
      })
      .catch((e: unknown) => {
        return new OcdlError("REQUEST_DATA_FAILED", e);
      });

    if (data instanceof OcdlError) {
      throw data;
    }

    return data;
  }
}

import { BinaryWriter, File, IFile } from "csbinary";
import { openSync, writeFileSync } from "fs";
import type Config from "../struct/Config";
import OcdlError from "../struct/OcdlError";
import { BeatMapV2, Collection, ModeByte } from "../types";
import Logger from "./Logger";
import _path from "path";

export default class OsdbGenerator {
  filePath: string;
  fileName: string;
  file: IFile;
  writer: BinaryWriter;
  collection: Collection;
  beatMaps: BeatMapV2[];

  constructor(config: Config, collection: Collection, beatMaps: BeatMapV2[]) {
    this.fileName = collection.name + ".osdb";
    this.filePath = _path.join(
      config.directory,
      collection.name, // Folder name
      this.fileName
    );
    // Create file
    writeFileSync(this.filePath, "");

    this.file = File(openSync(this.filePath, "w")); // "w" for write

    this.writer = new BinaryWriter(this.file);

    this.collection = collection;
    this.beatMaps = beatMaps;
  }

  // * Refer https://github.com/Piotrekol/CollectionManager/blob/master/CollectionManagerDll/Modules/FileIO/FileCollections/OsdbCollectionHandler.cs#L89
  async writeOsdb(): Promise<void> {
    try {
      // Version 6 does not need to compress
      this.writer.writeString("o!dm6");

      // Date
      this.writer.writeDouble(this.toOADate(new Date()));

      // Editor
      this.writer.writeString(this.collection.uploader.username);

      // Num of collections
      this.writer.writeInt32(1); // Always 1

      // Name
      this.writer.writeString(this.collection.name);

      // Beatmap count
      this.writer.writeInt32(this.beatMaps.length);

      for (const beatmap of this.beatMaps) {
        // beatmapId
        this.writer.writeInt32(beatmap.id);

        // beatmapSetId
        this.writer.writeInt32(beatmap.beatmapset_id);

        // Artist
        this.writer.writeString(beatmap.beatmapset.artist);
        // title
        this.writer.writeString(beatmap.beatmapset.title);
        // diffname
        this.writer.writeString(beatmap.version);

        // Md5
        this.writer.writeString(beatmap.checksum);

        // User comment
        this.writer.writeString("");

        // Play mode
        this.writer.writeByte(ModeByte[beatmap.mode]);

        // Mod PP Star
        this.writer.writeDouble(beatmap.difficulty_rating);
      }

      // Map with hash
      this.writer.writeInt32(0); // Always 0

      // Footer
      this.writer.writeString("By Piotrekol"); // Fixed Footer
    } catch (e) {
      Logger.generateErrorLog(new OcdlError("GENERATE_OSDB_FAILED", e));
    } finally {
      this.closeWriter();
    }
  }

  private toOADate(date: Date): number {
    const timezoneOffset = date.getTimezoneOffset() / (60 * 24);
    const msDateObj = date.getTime() / 86400000 + (25569 - timezoneOffset);
    return msDateObj;
  }

  private closeWriter(): void {
    this.writer.close();
  }
}

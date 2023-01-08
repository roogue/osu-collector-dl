import { BinaryWriter, File, IFile } from "csbinary";
import { openSync, writeFileSync } from "fs";
import _path from "path";
import Manager from "./Manager";

export default class OsdbGenerator extends Manager {
  filePath: string;
  fileName: string;
  file: IFile;
  writer: BinaryWriter;

  constructor() {
    super();
    this.fileName = Manager.collection.getReplacedName() + ".osdb";
    this.filePath = _path.join(
      Manager.config.directory,
      Manager.collection.getReplacedName(), // Folder name
      this.fileName // File name
    );
    // Create the file
    writeFileSync(this.filePath, "");

    // Access the file in writing mode
    this.file = File(openSync(this.filePath, "w")); // "w" for write

    // Create a BinaryWriter instance for binary writing
    this.writer = new BinaryWriter(this.file);
  }

  // * Refer https://github.com/Piotrekol/CollectionManager/blob/master/CollectionManagerDll/Modules/FileIO/FileCollections/OsdbCollectionHandler.cs#L89
  async writeOsdb(): Promise<void> {
    try {
      // The version of the osdb file
      // Using version o!dm6 so the file does not need to be compressed
      this.writer.writeString("o!dm6");

      // OADate
      this.writer.writeDouble(this._toOADate(new Date()));

      // Editor of the collection
      this.writer.writeString(Manager.collection.uploader.username);

      // Number of collections
      this.writer.writeInt32(1); // Always 1

      // Collection name
      this.writer.writeString(Manager.collection.name);

      // Beatmap count
      this.writer.writeInt32(Manager.collection.beatMapCount);

      // Write the info for each beatmap in the collection
      Manager.collection.beatMapSets.forEach((beatMapSet, beatMapSetId) => {
        beatMapSet.beatMaps.forEach((beatmap, beatMapId) => {
          // Beatmap id
          this.writer.writeInt32(beatMapId);

          // Beatmap set id
          this.writer.writeInt32(beatMapSetId);

          // Artist of the beatmap set
          this.writer.writeString(beatMapSet.artist ?? "Unknown");
          // Title of the beatmap set
          this.writer.writeString(beatMapSet.title ?? "Unknown");
          // Version of the beatmap
          this.writer.writeString(beatmap.version ?? "Unknown");

          // Md5 of the beatmap
          this.writer.writeString(beatmap.checksum);

          // User comment, leave it as empty string
          this.writer.writeString("");

          // The mode of the beatmap
          this.writer.writeByte(beatmap.mode ?? 0);

          // The difficulty rating of the beatmap
          this.writer.writeDouble(beatmap.difficulty_rating ?? 0);
        });
      });

      // Map with hash
      this.writer.writeInt32(0); // Always 0

      // Footer
      this.writer.writeString("By Piotrekol"); // Fixed Footer, which is used to determine if the file was corrupted or not
    } catch (e) {
      throw e;
    } finally {
      // Close the writer properly after the writing process was errored or done
      this._closeWriter();
    }
  }

  // Calculation of current date to OADate
  private _toOADate(date: Date): number {
    // Idk much, the function is copy and pasted from StackOverFlow :)
    const timezoneOffset = date.getTimezoneOffset() / (60 * 24);
    const msDateObj = date.getTime() / 86400000 + (25569 - timezoneOffset);
    return msDateObj;
  }

  private _closeWriter(): void {
    this.writer.close();
  }
}

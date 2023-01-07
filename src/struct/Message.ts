export class Message {
  private message: Msg;
  private variable: Record<string, string>;

  constructor(message: Msg, variable?: Record<string, string>) {
    this.message = message;
    this.variable = variable ?? {};
  }

  toString() {
    // Replace value if variable is provided
    let msg: string = this.message;
    for (const [key, value] of Object.entries(this.variable)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      msg = msg.replace(regex, value);
    }
    return msg;
  }
}

export enum Msg {
  NO_CONNECTION = "This script only runs with presence of internet connection.",

  INPUT_ID = "Enter the collection ID you want to download:",
  INPUT_ID_ERR = "ID should be a number, Ex: '44' (without the quote)",
  INPUT_MODE = "Generate .osdb file? (y/n) (Default: {{mode}}):",
  INPUT_MODE_ERR = "Invalid mode, please type 'y' or 'n' (without the quote)",

  FETCH_DATA = "Fetched data of [ {{amount}}/{{total}} ] beatmaps...",

  CREATE_FOLDER = "Creating folder {{name}}...",

  GENERATE_OSDB = "Generating {{name}}.osdb file",

  PRE_DOWNLOAD = "Download will starts automatically...",
  DOWNLOAD_FILE = "Downloading [ {{amount}}/{{total}} ] beatmap set...",
  DOWNLOAD_LOG = "{{log}}",
}

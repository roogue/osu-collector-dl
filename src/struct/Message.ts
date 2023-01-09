export class Message {
  // Message object that will be constructed with a Msg enum value
  // and an optional object with variables to be replaced in the message string
  private message: Msg;
  private variable: Record<string, string>;

  // Constructor to create a new Message object
  constructor(message: Msg, variable?: Record<string, string>) {
    // Assign the provided message and variable to the class properties
    this.message = message;
    this.variable = variable ?? {}; // default to an empty object if no variable provided
  }

  // Method to convert the message to a string with variables replaced
  toString(): string {
    // Replace value if variable is provided
    let msg: string = this.message; // get the message from the class property
    for (const [key, value] of Object.entries(this.variable)) {
      // iterate over the variables and replace the placeholders in the message string
      const regex = new RegExp(`{{${key}}}`, "g"); // create a regex to match the placeholder
      msg = msg.replace(regex, value); // replace the placeholder with the value
    }
    return msg; // return the modified message string
  }
}

// Enum with string values representing different messages
export enum Msg {
  NO_CONNECTION = "This script only runs with presence of internet connection.",

  NEW_VERSION = "New version ({{version}}) is available! Download latest version: {{url}}",

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

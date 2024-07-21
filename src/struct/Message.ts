export class Message {
  // Message object that will be constructed with a Msg enum value
  // and an optional object with variables to be replaced in the message string
  private message: Msg;
  private variable: Record<string, string>;

  // Constructor to create a new Message object
  constructor(message: Msg, variable: Record<string, string> = {}) {
    // Assign the provided message and variable to the class properties
    this.message = message;
    this.variable = variable;
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
  FREEZE = "Please press 'Enter' to {{action}}.",
  HEADER = "Collection: {{id}} - {{name}} | Working Mode: {{mode}}\n",

  CHECK_INTERNET_CONNECTION = "Checking for internet connection...",
  NO_CONNECTION = "This script only runs with presence of internet connection.",

  CHECK_NEW_VERSION = "Checking for new version...",
  NEW_VERSION = "New version ({{version}}) is available! Download the latest version: \n{{url}}\n",

  INPUT_ID = "Enter the collection ID you want to download:",
  INPUT_ID_ERR = "ID should be a number, Ex: '44' (without the quote)",
  INPUT_MODE_DESCRIPTION = "1: Download Beatmap Set only\n2: Download Beatmap Set + Generate .osdb\n3: Generate .osdb only\n",
  INPUT_MODE = "Please select a working mode. (Default: {{mode}}):",
  INPUT_MODE_ERR = "Invalid mode, please type '1' or '2' or '3' (without the quote)",

  FETCH_DATA = "Fetched [ {{amount}}/{{total}} ] of beatmaps' data...",

  CREATE_FOLDER = "Creating folder {{name}}...",

  GENERATE_OSDB = "Generating {{name}}.osdb file...",
  GENERATED_OSDB = "Generated {{name}}.osdb file successfully.",

  DOWNLOAD_FILES = "Downloaded [ {{amount}}/{{total}} ] beatmap sets...",
  DOWNLOAD_LOG = "{{log}}",
  DOWNLOADING_FILE = "Downloading [{{id}}] {{name}}",
  RETRYING_DOWNLOAD = "Retrying [{{id}}] {{name}}",
  DOWNLOADED_FILE = "Downloaded [{{id}}] {{name}}",
  DOWNLOAD_FILE_FAILED = "Failed when downloading [{{id}}] {{name}}, due to error: {{error}}",
  RATE_LIMITED = "Download request rate is limited, cooling down for one minute...",
  DOWNLOAD_COMPLETED = "Download completed.",

  PROCESS_ERRORED = "An error occurred: {{error}}",
}

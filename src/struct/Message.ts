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

  CHECK_CONNECTION_TO_SERVER = "Connecting to server...",
  NO_CONNECTION = "Unable to connect to osu-collector's server, the server may be down, or you are not connected to internet.",

  CHECK_NEW_VERSION = "Checking for new version...",
  NEW_VERSION = "New version ({{version}}) is available! Download the latest version: \n{{url}}\n",

  CHECK_RATE_LIMIT = "Checking for rate limitation...",
  UNABLE_TO_GET_DAILY_RATE_LIMIT = "Warning: Unable to get daily rate limit, proceeding may cause incomplete downloads.",
  DAILY_RATE_LIMIT_HIT = "Your daily download rate limit hit!",
  DAILY_RATE_LIMIT_HIT_WARN = "Warning: Your daily download rate limit hit! Continue to generate .osdb only.",
  TO_DOWNLOADS_EXCEED_DAILY_RATE_LIMIT = "Warning: The collection size exceeds the remaining downloads limit ({{collection}} > {{limit}}), proceeding may cause incomplete downloads.",
  REMAINING_DOWNLOADS = "Remaining Downloads Available: {{amount}}",

  REQUEST_BLOCKED = "The download request is blocked. Please do not proceed with the download function to avoid potential ban.",

  RESOURCE_UNAVAILBALE = "The download request is blocked in your location for legal reasons, unable to download collection.",

  INPUT_ID = "Enter the collection ID you want to download:",
  INPUT_ID_ERR = "ID should be a number, Ex: '44' (without the quote)",

  INPUT_MODE_DESCRIPTION = "1: Download Beatmap Set only\n2: Download Beatmap Set + Generate .osdb\n3: Generate .osdb only\n",
  INPUT_MODE = "Please select a working mode. (Default: {{mode}}):",
  INPUT_MODE_ERR = "Invalid mode, please type '1' or '2' or '3' (without the quote)",

  FETCH_BRIEF_INFO = "Fetching brief info for collection {{id}}...",

  FETCH_DATA = "Fetched [ {{amount}}/{{total}} ] of beatmaps' data...",

  CREATING_FOLDER = "Creating folder {{name}}...",

  PREVIOUS_DOWNLOAD_FOUND = "There are unfinished downloads from a previous session.\n\n1: Resume those downloads\n2: Discard them and start fresh\n",
  INPUT_CONTINUE_DOWNLOAD = "Please select an option to continue. (Default: 1):",
  INPUT_CONTINUE_DOWNLOAD_ERR = "Invalid mode, please type '1' or '2' (without the quote)",

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

// Types of error in enumerator
export enum ErrorType {
  "INVALID_CONFIG" = "The config is invalid json type",
  "GET_USER_INPUT_FAILED" = "Error occurred while getting user input",
  "RESOLVE_JSON_FAILED" = "Error occurred while resolving res body to json",
  "GENERATE_OSDB_FAILED" = "Error occurred while generating .osdb",
  "REQUEST_DATA_FAILED" = "Error occurred while requesting data",
  "FOLDER_GENERATION_FAILED" = "Error occurred while generating folder",
  "FILE_NAME_EXTRACTION_FAILED" = "Error occurred while extracting file name",
  "MESSAGE_GENERATOR_FAILED" = "Error occurred while updating monitor",
  "CORRUPTED_RESPONSE" = "The api response is corrupted",
  "MANAGE_DOWNLOAD_FAILED" = "Error occurred while processing downloads",
}

// Returns a string containing the current date, a label, the string value associated with the errorType, and the error itself
const getMessage = (type: keyof typeof ErrorType, error: string): string => {
  return `${new Date().toLocaleTimeString()} | [OcdlError]: ${type} - ${
    ErrorType[type]
  }\n${error}`;
};

export default class OcdlError extends Error {
  constructor(errorType: keyof typeof ErrorType, error: unknown) {
    // Calls the parent class' constructor and sets the message property of the OcdlError instance
    super(getMessage(errorType, String(error)));
  }
}

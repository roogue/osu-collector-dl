export enum ErrorType {
  "GET_USER_INPUT_FAILED" = "Error occurred while getting user input",
  "RESOLVE_JSON_FAILED" = "Error occurred while resolving res body to json",
  "REQUEST_DOWNLOAD_FAILED" = "Error occurred while requesting download",
  "GENERATE_OSDB_FAILED" = "Error occurred while generating .osdb",
  "REQUEST_DATA_FAILED" = "Error occurred while requesting data",
  "FOLDER_GENERATION_FAILED" = "Error occurred while generating folder",
}

const getMessage = (type: keyof typeof ErrorType, error: any): string => {
  console.log(error);
  return `${new Date()} | [OcdlError]: ${type} - ${ErrorType[type]}\n${error}`;
};

export default class OcdlError extends Error {
  constructor(errorType: keyof typeof ErrorType, error: any) {
    super(getMessage(errorType, error));
  }
}

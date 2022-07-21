export enum ErrorType {
  "RESOLVE_JSON_FAILED" = "Error occurred while resolving res body to json",
  "REQUEST_DOWNLOAD_FAILED" = "Error occurred while requesting download",
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

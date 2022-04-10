const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Sleep Function
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Remove Duplicate From an Array
 */
export const removeDuplicate = (arr: any[]) => [...new Set(arr)];

export const pkgFixes = () => {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    // @ts-ignore
    (process.pkg
      ? path.join(
          path.dirname(process.execPath),
          "puppeteer",
          ...puppeteer.executablePath().split(path.sep).slice(6) // /snapshot/project/node_modules/puppeteer/.local-chromium
        )
      : puppeteer.executablePath())
  );
};

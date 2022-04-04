/**
 * Sleep Function
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Remove Duplicate From an Array
 */
export const removeDuplicate = (arr: any[]) => [...new Set(arr)];
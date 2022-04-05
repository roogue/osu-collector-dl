"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDuplicate = exports.sleep = void 0;
/**
 * Sleep Function
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
exports.sleep = sleep;
/**
 * Remove Duplicate From an Array
 */
const removeDuplicate = (arr) => [...new Set(arr)];
exports.removeDuplicate = removeDuplicate;
//# sourceMappingURL=util.js.map
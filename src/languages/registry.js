import { KSL } from "./ksl.js";
import { ASL } from "./asl.js";
import { KSL_WORDS } from "./kslWords.js";
import { BSL } from "./bsl.js";

export const LANGUAGES = [KSL, ASL, KSL_WORDS, BSL];

export const DEFAULT_LANGUAGE_ID = "KSL";

export function getById(id) {
  return LANGUAGES.find((language) => language.id === id)
    ?? LANGUAGES.find((language) => language.id === DEFAULT_LANGUAGE_ID)
    ?? LANGUAGES[0];
}

export function listForMenu() {
  return [...LANGUAGES].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

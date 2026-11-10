import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const errors = [];
const warnings = [];

const html = readFileSync(join(root, "index.html"), "utf8");
const main = readFileSync(join(root, "src/main.js"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const referenced = new Set([...main.matchAll(/(?<!\$)\$\("([^"]+)"\)/g)].map((match) => match[1]));
for (const id of referenced) {
  if (!ids.has(id)) errors.push(`main.js references missing element id: #${id}`);
}

const localAssets = [
  ...html.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g),
].map((match) => match[1]);
for (const asset of localAssets) {
  if (!existsSync(join(root, asset))) errors.push(`index.html references missing local asset: ${asset}`);
}

const precache = [...sw.matchAll(/"\.\/([^"]*)"/g)]
  .map((match) => match[1])
  .filter(Boolean);
for (const asset of precache) {
  if (!existsSync(join(root, asset.split("?")[0]))) errors.push(`sw.js precaches missing file: ${asset}`);
}

const externalScripts = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:[^"]+)"/g)];
for (const match of externalScripts) {
  errors.push(`index.html loads an external asset at runtime: ${match[1]}`);
}

const required = [
  "vendor/mediapipe/tasks/vision_bundle.mjs",
  "vendor/mediapipe/tasks/wasm/vision_wasm_internal.js",
  "vendor/mediapipe/tasks/wasm/vision_wasm_internal.wasm",
  "vendor/mediapipe/tasks/hand_landmarker.task",
  "src/data/models/asl-static.js",
  "src/data/models/ksl-words.js",
  "src/data/prototypes.js",
  "src/asr.js",
  "src/speech.js",
  "src/lib/phraseRecognizer.js",
  "src/text/phrases.js",
  "src/tts/espeak.js",
  "src/tts/languages.js",
  "vendor/tts/espeak/espeak-ng.js",
  "vendor/tts/espeak/espeak-ng.data",
  "manifest.webmanifest",
  "sw.js",
];
for (const file of required) {
  if (!existsSync(join(root, file))) errors.push(`required file is missing: ${file}`);
}

if (!html.includes('id="command-dialog"')) warnings.push("command palette dialog is missing");
if (!html.includes('id="tts-voice"')) warnings.push("TTS voice selector is missing");
if (!html.includes('id="asr-toggle"')) warnings.push("ASR toggle is missing");

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn("  - " + warning);
}

if (errors.length) {
  console.error("Glipter check failed:");
  for (const error of errors) console.error("  ✗ " + error);
  process.exit(1);
}

console.log(`Glipter check passed: ${ids.size} ids, ${precache.length} precached files, no runtime CDN loads.`);

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const datasets = [
  {
    name: "ASL Alphabet Hand Landmarks (CC0-1.0)",
    path: "datasets/raw/asl-borisgraudt.zip",
    url: "https://www.kaggle.com/api/v1/datasets/download/borisgraudt/asl-alphabet-hand-landmarks",
    sha256: "6314F5693F512D6EA193B76D2F88B0C0B62CCBB8909011839A66AD8348394685",
  },
  {
    name: "KSL hand landmarks (Apache-2.0)",
    path: "datasets/raw/ksl-joanwachuka.zip",
    url: "https://www.kaggle.com/api/v1/datasets/download/joanwachuka/ksl-hand-landmarks",
    sha256: "04C26FFE293573B61F7012C340FDE8EED1B2294B2EEE2F597FC1F6D4DBAE5288",
  },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

for (const dataset of datasets) {
  const target = join(root, dataset.path);
  let buffer;
  if (existsSync(target)) {
    buffer = readFileSync(target);
    console.log(`✓ ${dataset.name} already present`);
  } else {
    console.log(`↓ ${dataset.name}`);
    const response = await fetch(dataset.url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Failed to download ${dataset.url}: HTTP ${response.status}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer);
  }
  const actual = sha256(buffer);
  if (actual !== dataset.sha256) {
    throw new Error(`Checksum mismatch for ${dataset.path}\nexpected ${dataset.sha256}\nactual   ${actual}`);
  }
  console.log(`  sha256 ${actual}`);
}

console.log("\nDatasets ready. Rebuild the distilled artifacts with:");
console.log("  python scripts/train_asl.py");
console.log("  python scripts/train_ksl_words.py");
console.log("  node scripts/build-sw.mjs");

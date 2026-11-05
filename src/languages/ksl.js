import { ASL_STATIC_MODEL } from "../data/models/asl-static.js";
import { GlipterModel } from "../lib/model.js";
import { reorderKSL } from "../text/grammar.js";

/**
 * KSL fingerspelling is largely ASL-derived. No permissively licensed,
 * signer-independent KSL manual-alphabet landmark dataset is bundled yet,
 * so this profile uses the ASL static handshape model as a documented proxy
 * and applies KSL grammar at the text layer.
 */
const model = new GlipterModel(ASL_STATIC_MODEL);

export const KSL = {
  id: "KSL",
  name: "Kenyan Sign Language",
  shortName: "KSL",
  priority: 1,
  mode: "static",
  family: "fingerspelling + S-O-V reordering",
  wordGapMs: 2400,
  sentenceGapMs: 9500,
  classify(lm) {
    return model.predictStatic(lm);
  },
  reorder: reorderKSL,
  labels: ASL_STATIC_MODEL.labels,
  model: ASL_STATIC_MODEL,
  dataset: {
    name: "ASL Alphabet Hand Landmarks (proxy) + KSL hand landmarks",
    author: "Boris Graudt; Joan Wachuka",
    license: "CC0-1.0; Apache-2.0",
    note: "Shared handshapes are proxied from the ASL dataset. KSL-specific alphabet variants require a Deaf-led KSL dataset.",
  },
  metrics: ASL_STATIC_MODEL.metrics,
  review: { status: "pending", version: "0.1.0", reviewers: [], note: "No native Deaf KSL reviewer has signed off." },
  note: "KSL fingerspelling using ASL-derived handshapes, plus a small KSL S-O-V reordering rule. KSL has its own grammar and lexical variation; this is a demonstrator, not a validated KSL system. Deaf KSL review is required before any real deployment.",
  limitations: [
    "KSL-specific handshape variants are not yet covered.",
    "Grammar is a conservative verb-move rule, not a KSL grammar model.",
    "ASL proxy data is not a substitute for a KSL reference corpus.",
  ],
};

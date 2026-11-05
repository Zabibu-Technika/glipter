import { ASL_STATIC_MODEL } from "../data/models/asl-static.js";
import { GlipterModel } from "../lib/model.js";
import { reorderASL } from "../text/grammar.js";

const model = new GlipterModel(ASL_STATIC_MODEL);

export const ASL = {
  id: "ASL",
  name: "American Sign Language",
  shortName: "ASL",
  priority: 2,
  mode: "static",
  family: "one-handed fingerspelling",
  wordGapMs: 2200,
  sentenceGapMs: 9000,
  classify(lm) {
    return model.predictStatic(lm);
  },
  reorder: reorderASL,
  labels: ASL_STATIC_MODEL.labels,
  model: ASL_STATIC_MODEL,
  dataset: ASL_STATIC_MODEL.dataset,
  metrics: ASL_STATIC_MODEL.metrics,
  review: { status: "pending", version: "0.1.0", reviewers: [], note: "No native Deaf ASL reviewer has signed off." },
  note: "Data-driven static alphabet (A–Z) trained on the CC0 ASL Alphabet Hand Landmarks dataset. J and Z are motion letters and are only approximate here. Held-out frames score 99.9%, but this is not signer-independent validation and has not been reviewed by Deaf ASL signers.",
  limitations: [
    "Static handshapes only; J and Z need motion.",
    "Trained on one public landmark dataset, not a Deaf-led reference corpus.",
    "Not a substitute for a professional interpreter.",
  ],
};

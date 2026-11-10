import { KSL_WORDS_MODEL } from "../data/models/ksl-words.js";
import { GlipterModel } from "../lib/model.js";
import { reorderKSL } from "../text/grammar.js";

const model = new GlipterModel(KSL_WORDS_MODEL);

export const KSL_WORDS = {
  id: "KSL-WORDS",
  name: "KSL · Word signs (pilot)",
  shortName: "KSL words",
  priority: 1,
  version: "1.0.0",
  mode: "sequence",
  family: "isolated word signs",
  wordGapMs: 1400,
  sentenceGapMs: 6000,
  classify() {
    return null;
  },
  classifySequence(frames) {
    return model.predictSequence(frames);
  },
  reorder: reorderKSL,
  labels: KSL_WORDS_MODEL.labels,
  model: KSL_WORDS_MODEL,
  dataset: KSL_WORDS_MODEL.dataset,
  metrics: KSL_WORDS_MODEL.metrics,
  review: { status: "pending", version: "1.0.0", reviewers: [], reviewedAt: null, note: "No native Deaf KSL reviewer has signed off." },
  note: "Four-word KSL pilot: FATHER, HELLO, IS, MY. Trained on the Apache-2.0 KSL hand-landmark dataset (official train/validation/test split). 99.2% on held-out sequences, but the dataset is small, not signer-independent, and not a KSL lexicon. This mode needs Deaf KSL review before real use.",
  limitations: [
    "Four glosses only — not a conversation system.",
    "Small, non-signer-independent dataset.",
    "No facial or mouthing grammar, which KSL uses.",
  ],
};

import { LM, dist2D, palmSize } from "../lib/landmarks.js";
import { getFingerState } from "../lib/fingers.js";
import { reorderBSL } from "../text/grammar.js";

/**
 * BSL is genuinely two-handed: the non-dominant hand is a canvas and the
 * dominant hand taps or traces it. Until a permissively licensed BSL
 * landmark corpus is bundled, this stays rule-based and clearly experimental.
 */
export function classifyBSL(lm, lm2) {
  if (!lm || !lm2) return null;

  const dom = getFingerState(lm);
  const non = getFingerState(lm2);
  const p = palmSize(lm);
  const canvasOpen = non.index && non.middle && non.ring && non.pinky;

  const domTips = [LM.THUMB_TIP, LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];
  const nonPalm = [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP];
  let minDist = Infinity;
  for (const a of domTips) {
    for (const b of nonPalm) {
      const d = dist2D(lm[a], lm2[b]);
      if (d < minDist) minDist = d;
    }
  }
  const tapping = minDist < p * 0.55;

  if (canvasOpen && dom.index && dom.middle && dom.ring && dom.pinky && !dom.thumb) {
    return { id: "B", label: "B (BSL)", confidence: 0.58, modelId: "bsl-rules-v0" };
  }
  if (canvasOpen && dom.index && dom.middle && !dom.ring && !dom.pinky) {
    return { id: "V", label: "V (BSL)", confidence: 0.56, modelId: "bsl-rules-v0" };
  }
  if (canvasOpen && dom.index && !dom.middle && !dom.ring && !dom.pinky && dom.thumb) {
    return { id: "L", label: "L (BSL)", confidence: 0.52, modelId: "bsl-rules-v0" };
  }
  if (canvasOpen && !dom.index && !dom.middle && !dom.ring && !dom.pinky && tapping) {
    return { id: "A", label: "A (BSL)", confidence: 0.52, modelId: "bsl-rules-v0" };
  }
  return null;
}

export const BSL = {
  id: "BSL",
  name: "British Sign Language",
  shortName: "BSL",
  priority: 3,
  version: "1.0.0",
  mode: "static",
  family: "two-handed fingerspelling (experimental)",
  wordGapMs: 2200,
  sentenceGapMs: 9000,
  classify: classifyBSL,
  reorder: reorderBSL,
  labels: { A: "A", B: "B", L: "L", V: "V" },
  dataset: {
    name: "No permissively licensed BSL landmark corpus bundled",
    author: "—",
    license: "—",
    note: "The BSL profile is rule-based. A signer-independent BSL fingerspelling corpus is still needed.",
  },
  metrics: {
    note: "Rule-based. Not evaluated against a public BSL landmark benchmark.",
  },
  review: { status: "pending", version: "1.0.0", reviewers: [], reviewedAt: null, note: "No native Deaf BSL reviewer has signed off." },
  note: "Experimental two-handed BSL fingerspelling (A, B, L, V only). BSL uses two hands as a grammar-bearing system; this rule set is a proof of generalisation, not a usable BSL recogniser. No permissively licensed BSL landmark corpus is bundled yet.",
  limitations: [
    "Only four handshapes are recognised.",
    "Rules are not signer-independent or Deaf-validated.",
    "BSL grammar and non-manual features are out of scope.",
  ],
};

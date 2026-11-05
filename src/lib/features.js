/**
 * Deterministic landmark feature extraction.
 *
 * The exact same functions are used by:
 *   - the Python training scripts (translated line-for-line), and
 *   - the browser runtime.
 *
 * If you change the order of features here, retrain the models. The
 * feature layout is part of the model's public contract.
 */

import { FINGER_CHAINS, LM, dist3D } from "./landmarks.js";

export const FINGER_ORDER = ["thumb", "index", "middle", "ring", "pinky"];

export const DEFAULT_STATIC_SPEC = Object.freeze({
  kind: "static",
  normalize: "wrist-max",
  align2d: false,
  raw: true,
  pairwise: true,
  angles: true,
  mirror: true,
});

export const DEFAULT_TWO_HAND_SPEC = Object.freeze({
  kind: "two-hand",
  normalize: "wrist-max",
  align2d: false,
  raw: true,
  pairwise: true,
  angles: true,
  interHand: true,
  mirror: true,
});

export const DEFAULT_SEQUENCE_SPEC = Object.freeze({
  kind: "sequence",
  targetFrames: 24,
  summary: ["mean", "std", "min", "max", "delta", "motion"],
  mirror: true,
});

function asPoint(p) {
  return [p.x, p.y, p.z ?? 0];
}

function rotateZ(points, radians) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return points.map(([x, y, z]) => [x * c - y * s, x * s + y * c, z]);
}

/**
 * Center at the wrist, then scale by the maximum distance from the wrist.
 * This matches the preprocessing in the public ASL landmark dataset.
 */
export function normalizeHand(lm, { align2d = false } = {}) {
  const points = lm.map(asPoint);
  const [wx, wy, wz] = points[0];
  let out = points.map(([x, y, z]) => [x - wx, y - wy, z - wz]);

  if (align2d) {
    const [mx, my] = out[LM.MIDDLE_MCP];
    const radians = Math.atan2(my, mx) + Math.PI / 2;
    out = rotateZ(out, radians);
  }

  let max = 0;
  for (const [x, y, z] of out) {
    const d = Math.hypot(x, y, z);
    if (d > max) max = d;
  }
  if (max > 1e-9) out = out.map(([x, y, z]) => [x / max, y / max, z / max]);
  return out;
}

/** Mirror a hand across the wrist's vertical axis. */
export function mirrorNormalized(points) {
  return points.map(([x, y, z]) => [-x, y, z]);
}

function pairDistances(points) {
  const out = [];
  for (let i = 0; i < 21; i++) {
    for (let j = i + 1; j < 21; j++) {
      const a = points[i];
      const b = points[j];
      out.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  return out;
}

function jointAngles(points) {
  const out = [];
  for (const finger of FINGER_ORDER) {
    const [a, b, c, d] = FINGER_CHAINS[finger];
    for (const [i, j, k] of [[a, b, c], [b, c, d]]) {
      const ux = points[i][0] - points[j][0];
      const uy = points[i][1] - points[j][1];
      const uz = points[i][2] - points[j][2];
      const vx = points[k][0] - points[j][0];
      const vy = points[k][1] - points[j][1];
      const vz = points[k][2] - points[j][2];
      const dot = ux * vx + uy * vy + uz * vz;
      const mag = Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz);
      out.push(mag === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, dot / mag))));
    }
  }
  return out;
}

/** Build the feature vector from an already-normalized hand. */
export function featuresFromNormalized(points, spec = DEFAULT_STATIC_SPEC) {
  const out = [];
  if (spec.raw !== false) {
    for (const [x, y, z] of points) out.push(x, y, z);
  }
  if (spec.pairwise) out.push(...pairDistances(points));
  if (spec.angles) out.push(...jointAngles(points));
  return out;
}

/** Build a static feature vector from raw landmarks. */
export function handFeatures(lm, spec = DEFAULT_STATIC_SPEC) {
  const points = normalizeHand(lm, spec);
  return featuresFromNormalized(points, spec);
}

function orderPair(lm, lm2) {
  if (!lm) return [lm2, null].filter(Boolean);
  if (!lm2) return [lm, null];
  return lm[LM.WRIST].x <= lm2[LM.WRIST].x ? [lm, lm2] : [lm2, lm];
}

/**
 * Canonical two-hand vector. Hands are ordered left-to-right by wrist x so
 * the input is stable regardless of MediaPipe's array order. Missing hands
 * are zero-filled, which lets the same model handle one-handed signs.
 */
export function twoHandFeatures(lm, lm2, spec = DEFAULT_TWO_HAND_SPEC) {
  const [first, second] = orderPair(lm, lm2);
  const a = first ? normalizeHand(first, spec) : null;
  const b = second ? normalizeHand(second, spec) : null;
  const left = a ? featuresFromNormalized(a, spec) : new Array(singleHandFeatureSize(spec)).fill(0);
  const right = b ? featuresFromNormalized(b, spec) : new Array(singleHandFeatureSize(spec)).fill(0);
  const out = [...left, ...right];

  if (spec.interHand) {
    if (a && b) {
      // Wrist-to-wrist distance plus corresponding fingertip distances.
      out.push(dist3DNormalized(a[LM.WRIST], b[LM.WRIST]));
      for (const tip of [4, 8, 12, 16, 20]) {
        out.push(dist3DNormalized(a[tip], b[tip]));
      }
    } else {
      out.push(0, 0, 0, 0, 0, 0);
    }
  }
  return out;
}

function dist3DNormalized(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function singleHandFeatureSize(spec = DEFAULT_STATIC_SPEC) {
  return (spec.raw !== false ? 63 : 0)
    + (spec.pairwise ? 210 : 0)
    + (spec.angles ? 10 : 0);
}

export function twoHandFeatureSize(spec = DEFAULT_TWO_HAND_SPEC) {
  return singleHandFeatureSize(spec) * 2 + (spec.interHand ? 6 : 0);
}

/** Linear interpolation resample of a sequence of equal-length vectors. */
export function resampleSequence(vectors, targetFrames = 24) {
  if (!vectors.length) return [];
  if (vectors.length === 1) return new Array(targetFrames).fill(vectors[0]);
  const out = [];
  const last = vectors.length - 1;
  for (let i = 0; i < targetFrames; i++) {
    const t = (i / (targetFrames - 1)) * last;
    const lo = Math.floor(t);
    const hi = Math.min(last, lo + 1);
    const f = t - lo;
    const a = vectors[lo];
    const b = vectors[hi];
    const row = new Array(a.length);
    for (let k = 0; k < a.length; k++) row[k] = a[k] * (1 - f) + b[k] * f;
    out.push(row);
  }
  return out;
}

export function sequenceSummary(vectors, spec = DEFAULT_SEQUENCE_SPEC) {
  if (!vectors.length) return [];
  const resampled = resampleSequence(vectors, spec.targetFrames ?? 24);
  const dim = resampled[0].length;
  const n = resampled.length;
  const mean = new Array(dim).fill(0);
  const min = new Array(dim).fill(Infinity);
  const max = new Array(dim).fill(-Infinity);
  for (const row of resampled) {
    for (let i = 0; i < dim; i++) {
      mean[i] += row[i];
      if (row[i] < min[i]) min[i] = row[i];
      if (row[i] > max[i]) max[i] = row[i];
    }
  }
  for (let i = 0; i < dim; i++) mean[i] /= n;

  const std = new Array(dim).fill(0);
  for (const row of resampled) {
    for (let i = 0; i < dim; i++) {
      const d = row[i] - mean[i];
      std[i] += d * d;
    }
  }
  for (let i = 0; i < dim; i++) std[i] = Math.sqrt(std[i] / n);

  const motion = new Array(dim).fill(0);
  for (let f = 1; f < n; f++) {
    for (let i = 0; i < dim; i++) motion[i] += Math.abs(resampled[f][i] - resampled[f - 1][i]);
  }
  for (let i = 0; i < dim; i++) motion[i] /= Math.max(1, n - 1);

  const out = [];
  for (const key of spec.summary ?? DEFAULT_SEQUENCE_SPEC.summary) {
    if (key === "mean") out.push(...mean);
    else if (key === "std") out.push(...std);
    else if (key === "min") out.push(...min);
    else if (key === "max") out.push(...max);
    else if (key === "delta") {
      for (let i = 0; i < dim; i++) out.push(resampled[n - 1][i] - resampled[0][i]);
    } else if (key === "motion") out.push(...motion);
  }
  return out;
}

/** Extract the two-hand vector for one frame object. */
export function frameTwoHandFeatures(frame, spec = DEFAULT_TWO_HAND_SPEC) {
  const hands = frame?.hands ?? [];
  const a = hands[0]?.landmarks ?? null;
  const b = hands[1]?.landmarks ?? null;
  return twoHandFeatures(a, b, spec);
}

/** Build sequence-summary features from an array of frames. */
export function sequenceFeatures(frames, spec = DEFAULT_SEQUENCE_SPEC, twoHandSpec = DEFAULT_TWO_HAND_SPEC) {
  const vectors = [];
  for (const frame of frames) {
    if (!frame?.hands?.length) continue;
    vectors.push(frameTwoHandFeatures(frame, twoHandSpec));
  }
  if (vectors.length < 8) return null;
  return sequenceSummary(vectors, spec);
}

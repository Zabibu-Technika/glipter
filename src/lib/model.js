/**
 * Tiny, dependency-free inference runtime for Glipter's bundled models.
 *
 * Models are plain JSON/JS objects exported by the training scripts:
 *   { classes, labels, feature, mean, std, layers, metrics, dataset }
 *
 * The runtime is deliberately small (a few hundred lines) so the whole app
 * works offline, on low-end devices, with no WASM runtime of its own.
 */

import {
  DEFAULT_SEQUENCE_SPEC,
  DEFAULT_STATIC_SPEC,
  DEFAULT_TWO_HAND_SPEC,
  featuresFromNormalized,
  handFeatures,
  mirrorNormalized,
  normalizeHand,
  sequenceFeatures,
  twoHandFeatures,
} from "./features.js";

function softmax(values) {
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  const exps = new Array(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const e = Math.exp(values[i] - max);
    exps[i] = e;
    sum += e;
  }
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = exps[i] / (sum || 1);
  return out;
}

function forward(layers, input, mean, std) {
  let x = input;
  if (mean && std) {
    x = new Array(input.length);
    for (let i = 0; i < input.length; i++) {
      x[i] = (input[i] - mean[i]) / (std[i] || 1);
    }
  }
  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];
    const weights = layer.weights;
    const bias = layer.bias;
    const outDim = bias.length;
    const inDim = x.length;
    const z = new Array(outDim);
    for (let j = 0; j < outDim; j++) {
      let sum = bias[j];
      for (let i = 0; i < inDim; i++) sum += x[i] * weights[i][j];
      z[j] = sum;
    }
    const activation = layer.activation ?? (l === layers.length - 1 ? "softmax" : "relu");
    if (activation === "relu") {
      for (let j = 0; j < outDim; j++) z[j] = z[j] > 0 ? z[j] : 0;
    } else if (activation === "softmax") {
      return softmax(z);
    }
    x = z;
  }
  return softmax(x);
}

function topK(probabilities, classes, labels, k = 3) {
  const order = probabilities
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k);
  return order.map(({ p, i }) => ({
    id: classes[i],
    label: labels?.[classes[i]] ?? classes[i],
    confidence: p,
  }));
}

function resultFromProbabilities(probabilities, spec) {
  let best = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[best]) best = i;
  }
  const id = spec.classes[best];
  return {
    id,
    label: spec.labels?.[id] ?? id,
    confidence: probabilities[best],
    probabilities,
    top3: topK(probabilities, spec.classes, spec.labels, 3),
    modelId: spec.id,
    modelVersion: spec.version,
  };
}

function bestOf(candidates) {
  let best = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || candidate.confidence > best.confidence) best = candidate;
  }
  return best;
}

function mirrorFrame(frame) {
  return {
    ...frame,
    hands: (frame.hands ?? []).map((hand) => ({
      ...hand,
      landmarks: hand.landmarks.map((p) => ({ ...p, x: -p.x })),
    })),
  };
}

export class GlipterModel {
  constructor(spec) {
    if (!spec || !Array.isArray(spec.classes) || !Array.isArray(spec.layers)) {
      throw new Error("Invalid Glipter model: expected classes[] and layers[]");
    }
    this.spec = spec;
    this.id = spec.id;
    this.classes = spec.classes;
    this.labels = spec.labels ?? {};
    this.threshold = spec.threshold ?? 0.45;
    this.feature = {
      ...(spec.kind === "sequence" ? DEFAULT_SEQUENCE_SPEC : DEFAULT_STATIC_SPEC),
      ...(spec.feature ?? {}),
    };
    this.twoHandFeature = {
      ...DEFAULT_TWO_HAND_SPEC,
      ...(spec.twoHandFeature ?? {}),
    };
    this.mean = spec.mean ?? null;
    this.std = spec.std ?? null;
  }

  get kind() {
    return this.spec.kind ?? this.feature.kind ?? "static";
  }

  get metrics() {
    return this.spec.metrics ?? {};
  }

  get dataset() {
    return this.spec.dataset ?? {};
  }

  _predictFeatures(features) {
    const probabilities = forward(this.spec.layers, features, this.mean, this.std);
    return resultFromProbabilities(probabilities, this.spec);
  }

  predictStatic(lm) {
    if (!lm) return null;
    const points = normalizeHand(lm, this.feature);
    const candidates = [this._predictFeatures(featuresFromNormalized(points, this.feature))];
    if (this.feature.mirror !== false) {
      candidates.push(
        this._predictFeatures(featuresFromNormalized(mirrorNormalized(points), this.feature)),
      );
    }
    return bestOf(candidates);
  }

  predictTwoHand(lm, lm2) {
    if (!lm && !lm2) return null;
    const candidates = [this._predictFeatures(twoHandFeatures(lm, lm2, this.twoHandFeature))];
    if (this.feature.mirror !== false || this.twoHandFeature.mirror !== false) {
      const mirror = (hand) => (hand ? hand.map((p) => ({ ...p, x: -p.x })) : null);
      candidates.push(
        this._predictFeatures(
          twoHandFeatures(mirror(lm), mirror(lm2), this.twoHandFeature),
        ),
      );
    }
    return bestOf(candidates);
  }

  predictSequence(frames) {
    if (!frames || frames.length < 8) return null;
    const candidates = [];
    const base = sequenceFeatures(frames, this.feature, this.twoHandFeature);
    if (base) candidates.push(this._predictFeatures(base));
    if (this.feature.mirror !== false) {
      const mirrored = sequenceFeatures(frames.map(mirrorFrame), this.feature, this.twoHandFeature);
      if (mirrored) candidates.push(this._predictFeatures(mirrored));
    }
    return bestOf(candidates);
  }

  predict(lm, lm2 = null) {
    if (this.kind === "sequence") return null;
    if (this.kind === "two-hand" || this.feature.kind === "two-hand") {
      return this.predictTwoHand(lm, lm2);
    }
    return this.predictStatic(lm);
  }
}

/** Convenience: classify a raw hand with a model spec, without constructing a class. */
export function classifyHand(spec, lm) {
  return new GlipterModel(spec).predictStatic(lm);
}

import { ASL_STATIC_MODEL } from "../data/models/asl-static.js";
import { KSL_WORDS_MODEL } from "../data/models/ksl-words.js";
import { GlipterModel } from "../lib/model.js";
import { getFingerState } from "../lib/fingers.js";
import { normalizeHand, mirrorNormalized } from "../lib/features.js";
import { palmSize } from "../lib/landmarks.js";
import { ASL_FIXTURES } from "./fixtures/asl.js";
import { KSL_WORDS_FIXTURES } from "./fixtures/ksl-words.js";
import { BSL_GOLDENS, GEOMETRY_GOLDENS, makeSyntheticHand } from "./goldens.js";
import { BSL } from "../languages/bsl.js";
import { reorderASL, reorderKSL, reorderBSL } from "../text/grammar.js";
import { RestPoseSegmenter } from "../lib/segmentation.js";
import { buildBundle, createEntry } from "../review/signBank.js";

const aslModel = new GlipterModel(ASL_STATIC_MODEL);
const kslModel = new GlipterModel(KSL_WORDS_MODEL);

function toHand(flat) {
  return flat.map(([x, y, z]) => ({ x, y, z }));
}

function flatSequenceToFrames(flatFrames) {
  return flatFrames.map((flat) => {
    const hands = [];
    for (let h = 0; h < 2; h++) {
      const chunk = flat.slice(h * 63, h * 63 + 63);
      if (chunk.every((value) => Math.abs(value) < 1e-9)) continue;
      const landmarks = [];
      for (let i = 0; i < 21; i++) {
        landmarks.push({ x: chunk[i * 3], y: chunk[i * 3 + 1], z: chunk[i * 3 + 2] });
      }
      hands.push({ landmarks, handedness: h === 0 ? "Left" : "Right" });
    }
    return { hands };
  });
}

function add(layer, result) {
  layer.results.push(result);
}

function summarize(layer) {
  layer.passed = layer.results.filter((r) => r.pass).length;
  layer.total = layer.results.length;
  return layer;
}

function runAslFixtures() {
  const layer = {
    id: "asl-model",
    name: "ASL alphabet · held-out landmarks",
    description: "Real held-out samples from the CC0 ASL landmark dataset.",
    results: [],
  };
  for (const fixture of ASL_FIXTURES) {
    let actual = null;
    let error = null;
    try {
      const prediction = aslModel.predictStatic(toHand(fixture.landmarks));
      actual = prediction?.id ?? null;
    } catch (e) {
      error = e.message;
    }
    add(layer, {
      name: `ASL ${fixture.className}`,
      expected: fixture.className,
      actual,
      pass: actual === fixture.className && !error,
      error,
      confidence: fixture.confidence,
    });
  }
  return summarize(layer);
}

function runKslFixtures() {
  const layer = {
    id: "ksl-model",
    name: "KSL word signs · held-out sequences",
    description: "Official test-split sequences from the Apache-2.0 KSL landmark dataset.",
    results: [],
  };
  for (const fixture of KSL_WORDS_FIXTURES) {
    let actual = null;
    let error = null;
    try {
      const prediction = kslModel.predictSequence(flatSequenceToFrames(fixture.frames));
      actual = prediction?.id ?? null;
    } catch (e) {
      error = e.message;
    }
    add(layer, {
      name: `KSL ${fixture.className}`,
      expected: fixture.className,
      actual,
      pass: actual === fixture.className && !error,
      error,
      confidence: fixture.confidence,
    });
  }
  return summarize(layer);
}

function runBslRules() {
  const layer = {
    id: "bsl-rules",
    name: "BSL two-handed rules · synthetic",
    description: "Rule-based BSL proof of generalisation. No BSL landmark corpus is bundled.",
    results: [],
  };
  for (const golden of BSL_GOLDENS) {
    const dominant = makeSyntheticHand(golden.dom);
    const nonDominant = makeSyntheticHand(golden.non);
    let actual = null;
    let error = null;
    try {
      actual = BSL.classify(dominant, nonDominant)?.id ?? null;
    } catch (e) {
      error = e.message;
    }
    add(layer, {
      name: golden.name,
      expected: golden.expect,
      actual,
      pass: actual === golden.expect && !error,
      error,
    });
  }
  return summarize(layer);
}

function runGeometry() {
  const layer = {
    id: "geometry",
    name: "Geometry primitives",
    description: "Finger extension, palm scale, normalization, and mirroring.",
    results: [],
  };
  for (const golden of GEOMETRY_GOLDENS) {
    const lm = makeSyntheticHand(golden.fingers);
    let state = null;
    let error = null;
    try {
      state = getFingerState(lm);
    } catch (e) {
      error = e.message;
    }
    const pass = state
      && ["thumb", "index", "middle", "ring", "pinky"].every((k) => state[k] === golden.fingers[k]);
    add(layer, {
      name: golden.name,
      expected: JSON.stringify(golden.fingers),
      actual: state ? JSON.stringify(state) : null,
      pass: Boolean(pass) && !error,
      error,
    });
  }

  const lm = makeSyntheticHand(GEOMETRY_GOLDENS[0].fingers);
  const normalized = normalizeHand(lm);
  const mirroredTwice = mirrorNormalized(mirrorNormalized(normalized));
  const roundTrip = mirroredTwice.every(([x, y, z], i) =>
    Math.abs(x - normalized[i][0]) < 1e-9
    && Math.abs(y - normalized[i][1]) < 1e-9
    && Math.abs(z - normalized[i][2]) < 1e-9);
  add(layer, {
    name: "geometry · mirror is an involution",
    expected: "true",
    actual: String(roundTrip),
    pass: roundTrip,
  });
  add(layer, {
    name: "geometry · palm size is positive",
    expected: "> 0",
    actual: String(palmSize(lm)),
    pass: palmSize(lm) > 0,
  });
  return summarize(layer);
}

function runModelIntegrity() {
  const layer = {
    id: "integrity",
    name: "Model integrity",
    description: "Layer shapes, class counts, and text grammar contracts.",
    results: [],
  };
  for (const spec of [ASL_STATIC_MODEL, KSL_WORDS_MODEL]) {
    const first = spec.layers[0];
    const last = spec.layers[spec.layers.length - 1];
    const inputOk = spec.mean?.length === first.weights.length
      && spec.std?.length === first.weights.length;
    const hiddenOk = first.weights.every((row) => row.length === first.bias.length);
    const outputOk = last.bias.length === spec.classes.length
      && last.weights.every((row) => row.length === spec.classes.length);
    add(layer, {
      name: `${spec.id} · input + hidden shapes`,
      expected: "consistent",
      actual: inputOk && hiddenOk ? "consistent" : "mismatch",
      pass: inputOk && hiddenOk,
    });
    add(layer, {
      name: `${spec.id} · output classes`,
      expected: String(spec.classes.length),
      actual: String(last.bias.length),
      pass: outputOk,
    });
  }

  const grammarCases = [
    { name: "ASL letter runs", fn: () => reorderASL(["H", "E", "L", "L", "O", "MY"]), expect: "Hello my" },
    { name: "KSL S-O-V move", fn: () => reorderKSL(["MY", "FATHER", "IS"]), expect: "My is father" },
    { name: "BSL letter runs", fn: () => reorderBSL(["B", "S", "L"]), expect: "BSL" },
  ];
  for (const grammar of grammarCases) {
    let actual = null;
    let error = null;
    try {
      actual = grammar.fn();
    } catch (e) {
      error = e.message;
    }
    add(layer, {
      name: `grammar · ${grammar.name}`,
      expected: grammar.expect,
      actual,
      pass: actual === grammar.expect && !error,
      error,
    });
  }
  return summarize(layer);
}

function runPipeline() {
  const layer = {
    id: "pipeline",
    name: "Tier 1 pipeline · segmentation + sign bank",
    description: "Rest-pose boundaries and the landmark-only capture contract.",
    results: [],
  };
  const lm = makeSyntheticHand(GEOMETRY_GOLDENS[0].fingers);
  const frame = { hands: [{ landmarks: lm }] };

  let started = null;
  let ended = null;
  let error = null;
  try {
    const segmenter = new RestPoseSegmenter({ restFrames: 2 });
    started = segmenter.push(frame);
    segmenter.push(frame);
    segmenter.push({ hands: [] });
    ended = segmenter.push({ hands: [] });
  } catch (e) {
    error = e.message;
  }
  add(layer, {
    name: "rest-pose · start and end",
    expected: "started then ended",
    actual: `${started?.started ? "started" : "no start"} / ${ended?.ended ? "ended" : "no end"}`,
    pass: started?.started === true && ended?.ended === true && !error,
    error,
  });

  const frames = Array.from({ length: 8 }, (_, index) => ({
    t: index * 40,
    hands: [{ handedness: "Right", landmarks: lm.map((point) => [point.x, point.y, point.z]) }],
  }));
  let created = null;
  error = null;
  try {
    created = createEntry({
      id: "selftest",
      language: "KSL",
      gloss: "HELLO",
      frames,
      consent: true,
    });
  } catch (e) {
    error = e.message;
  }
  add(layer, {
    name: "sign bank · new captures are unreviewed",
    expected: "unreviewed",
    actual: created?.entry?.review?.status ?? "error",
    pass: created?.ok === true && created?.entry?.review?.status === "unreviewed" && !error,
    error,
  });

  const bundle = created?.entry ? buildBundle([created.entry], { exportedAt: 0 }) : null;
  add(layer, {
    name: "sign bank · export claims no reviewers",
    expected: "0",
    actual: String(bundle?.deafReviewers ?? "error"),
    pass: bundle?.deafReviewers === 0 && bundle?.reviewStatus === "unreviewed",
  });
  return summarize(layer);
}

export function runSelfTest() {
  const layers = [
    runAslFixtures(),
    runKslFixtures(),
    runBslRules(),
    runGeometry(),
    runModelIntegrity(),
    runPipeline(),
  ];
  const results = layers.flatMap((layer) => layer.results);
  const passed = layers.reduce((sum, layer) => sum + layer.passed, 0);
  const total = layers.reduce((sum, layer) => sum + layer.total, 0);
  return { layers, results, passed, total };
}

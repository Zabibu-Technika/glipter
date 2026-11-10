import test from "node:test";
import assert from "node:assert/strict";

import { runSelfTest } from "../src/selftest/runner.js";
import { ASL_STATIC_MODEL } from "../src/data/models/asl-static.js";
import { KSL_WORDS_MODEL } from "../src/data/models/ksl-words.js";
import { ASL_FIXTURES } from "../src/selftest/fixtures/asl.js";
import { KSL_WORDS_FIXTURES } from "../src/selftest/fixtures/ksl-words.js";
import { GlipterModel } from "../src/lib/model.js";
import {
  DEFAULT_SEQUENCE_SPEC,
  DEFAULT_TWO_HAND_SPEC,
  handFeatures,
  normalizeHand,
  mirrorNormalized,
  twoHandFeatures,
} from "../src/lib/features.js";
import { makeSyntheticHand } from "../src/selftest/goldens.js";
import { GestureDebouncer } from "../src/lib/debouncer.js";
import { TextAccumulator } from "../src/text/accumulator.js";
import { reorderASL, reorderKSL, reorderBSL } from "../src/text/grammar.js";
import { SessionLog } from "../src/telemetry.js";
import { handSvg } from "../src/ui.js";
import { canSpeak } from "../src/speech.js";
import { SpeechInput } from "../src/asr.js";
import { PhraseRecognizer } from "../src/lib/phraseRecognizer.js";
import { phraseForText } from "../src/text/phrases.js";
import { quickPhrasesFor, translateForSpeech } from "../src/text/spokenLanguages.js";
import { RestPoseSegmenter } from "../src/lib/segmentation.js";
import { validateProfile } from "../src/data/profileSchema.js";
import { ASL } from "../src/languages/asl.js";

const OPEN_HAND = { thumb: true, index: true, middle: true, ring: true, pinky: true };
const FIST = { thumb: false, index: false, middle: false, ring: false, pinky: false };

function toLandmarks(flat) {
  return flat.map(([x, y, z]) => ({ x, y, z }));
}

function framesFromFlat(frames) {
  return frames.map((flat) => {
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

test("on-device self-test passes every layer", () => {
  const result = runSelfTest();
  assert.equal(result.passed, result.total, "all self-test checks must pass");
  assert.equal(result.layers.length, 5);
  assert.equal(result.total, 74);
});

test("ASL model classifies every held-out fixture", () => {
  const model = new GlipterModel(ASL_STATIC_MODEL);
  for (const fixture of ASL_FIXTURES) {
    const prediction = model.predictStatic(toLandmarks(fixture.landmarks));
    assert.equal(prediction.id, fixture.className, `failed ${fixture.className}`);
    assert.ok(prediction.confidence > 0.5);
  }
});

test("KSL word model classifies every held-out sequence", () => {
  const model = new GlipterModel(KSL_WORDS_MODEL);
  for (const fixture of KSL_WORDS_FIXTURES) {
    const prediction = model.predictSequence(framesFromFlat(fixture.frames));
    assert.equal(prediction.id, fixture.className, `failed ${fixture.className}`);
  }
});

test("model layer dimensions match the exported metadata", () => {
  for (const spec of [ASL_STATIC_MODEL, KSL_WORDS_MODEL]) {
    const first = spec.layers[0];
    const last = spec.layers[spec.layers.length - 1];
    assert.equal(spec.mean.length, first.weights.length, `${spec.id} mean size`);
    assert.equal(spec.std.length, first.weights.length, `${spec.id} std size`);
    assert.equal(first.bias.length, first.weights[0].length, `${spec.id} hidden size`);
    assert.equal(last.bias.length, spec.classes.length, `${spec.id} class size`);
    assert.ok(spec.metrics.top1 >= 0.9, `${spec.id} held-out accuracy`);
  }
});

test("feature extraction has a stable shape", () => {
  const hand = makeSyntheticHand(OPEN_HAND);
  assert.equal(handFeatures(hand).length, 283);
  assert.equal(handFeatures(hand, { ...DEFAULT_TWO_HAND_SPEC, pairwise: false, angles: false }).length, 63);
  assert.equal(twoHandFeatures(hand, hand).length, 572);
  assert.equal(
    twoHandFeatures(hand, hand, { ...DEFAULT_TWO_HAND_SPEC, pairwise: false, angles: false }).length,
    132,
  );
});

test("normalization is scale-stable and mirroring is an involution", () => {
  const hand = makeSyntheticHand(OPEN_HAND);
  const normalized = normalizeHand(hand);
  const max = Math.max(...normalized.map(([x, y, z]) => Math.hypot(x, y, z)));
  assert.ok(Math.abs(max - 1) < 1e-9);
  const twice = mirrorNormalized(mirrorNormalized(normalized));
  for (let i = 0; i < twice.length; i++) {
    assert.ok(Math.abs(twice[i][0] - normalized[i][0]) < 1e-12);
    assert.ok(Math.abs(twice[i][1] - normalized[i][1]) < 1e-12);
    assert.ok(Math.abs(twice[i][2] - normalized[i][2]) < 1e-12);
  }
});

test("debouncer commits a stable sign and releases on nulls", () => {
  const debouncer = new GestureDebouncer(10, 6);
  for (let i = 0; i < 6; i++) debouncer.push("A", 0.9);
  assert.equal(debouncer.committed, "A");
  for (let i = 0; i < 7; i++) debouncer.push(null, 0);
  assert.equal(debouncer.committed, null);
});

test("accumulator joins letters, keeps repeated letters, and commits on pause", () => {
  const states = [];
  const accumulator = new TextAccumulator({
    profile: { id: "TEST", reorder: reorderASL },
    wordGapMs: 20,
    onState: (state) => states.push(state),
  });
  for (const letter of ["H", "E", "L", "L", "O"]) {
    accumulator.push({ id: letter, confidence: 0.9 });
    accumulator.push(null);
  }
  assert.equal(accumulator.getGlosses().join(""), "HELLO");
  accumulator.commitWord();
  accumulator.emit();
  assert.deepEqual(accumulator.getGlosses(), ["HELLO"]);
  assert.equal(accumulator.getEnglish(), "Hello");
  assert.ok(states.length > 0);
  accumulator.destroy();
});

test("grammar layers are deterministic", () => {
  assert.equal(reorderASL(["H", "E", "L", "L", "O", "MY"]), "Hello my");
  assert.equal(reorderASL(["HELLO", "GLIPTER"]), "Hello Glipter");
  assert.equal(reorderKSL(["MY", "FATHER", "IS"]), "My is father");
  assert.equal(reorderBSL(["B", "S", "L"]), "BSL");
});

test("phrase vocabulary renders conversational signs as English", () => {
  assert.equal(reorderASL(["ILY"]), "I love you");
  assert.equal(reorderASL(["HELLO"]), "Hello");
  assert.equal(reorderASL(["THANK-YOU"]), "Thank you");
  assert.equal(phraseForText("I love you")?.id, "ILY");
  assert.equal(phraseForText("thank you")?.id, "THANK-YOU");
  assert.equal(phraseForText("something unknown"), null);
});

test("phrase recognizer finds ILY, HELP, and motion signs", () => {
  const recognizer = new PhraseRecognizer();
  const ily = makeSyntheticHand({ thumb: true, index: true, middle: false, ring: false, pinky: true });
  const staticResult = recognizer.update({
    dominant: { landmarks: ily, fingers: { thumb: true, index: true, middle: false, ring: false, pinky: true } },
    nonDominant: null,
    timestamp: 1000,
  });
  assert.equal(staticResult?.id, "ILY");
  assert.equal(staticResult?.kind, "static");

  const fist = makeSyntheticHand({ thumb: false, index: false, middle: false, ring: false, pinky: false }, { offsetX: 0.02 });
  const open = makeSyntheticHand({ thumb: true, index: true, middle: true, ring: true, pinky: true });
  const help = recognizer.update({
    dominant: { landmarks: fist, fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false } },
    nonDominant: { landmarks: open, fingers: { thumb: true, index: true, middle: true, ring: true, pinky: true } },
    timestamp: 2000,
  });
  assert.equal(help?.id, "HELP");

  const j = new PhraseRecognizer();
  const pinky = { thumb: false, index: false, middle: false, ring: false, pinky: true };
  const path = [
    [0, 0], [0, 0.06], [0, 0.12], [-0.04, 0.16], [-0.09, 0.15], [-0.12, 0.08],
  ];
  let jResult = null;
  path.forEach(([x, y], i) => {
    const landmarks = makeSyntheticHand(pinky, { offsetX: x, offsetY: y });
    jResult = j.update({
      dominant: { landmarks, fingers: pinky },
      nonDominant: null,
      timestamp: 3000 + i * 50,
    }) ?? jResult;
  });
  assert.equal(jResult?.id, "J");
  assert.equal(jResult?.kind, "motion");

  const z = new PhraseRecognizer();
  const index = { thumb: false, index: true, middle: false, ring: false, pinky: false };
  const zPath = [
    [0, 0], [0.08, 0], [0.16, 0], [0.10, 0.08], [0.04, 0.10], [0.10, 0.06], [0.18, 0.04],
  ];
  let zResult = null;
  zPath.forEach(([x, y], i) => {
    const landmarks = makeSyntheticHand(index, { offsetX: x, offsetY: y });
    zResult = z.update({
      dominant: { landmarks, fingers: index },
      nonDominant: null,
      timestamp: 5000 + i * 40,
    }) ?? zResult;
  });
  assert.equal(zResult?.id, "Z");
  assert.equal(zResult?.kind, "motion");
});

test("spoken language packs drive phrases and spoken output", () => {
  assert.deepEqual(quickPhrasesFor("sw").slice(0, 3), ["Habari", "Asante", "Tafadhali"]);
  assert.equal(translateForSpeech("Hello my name is Glipter", "sw"), "Habari, jina langu ni Glipter.");
  assert.equal(translateForSpeech("I love you", "am"), "እወድሃለሁ");
  assert.equal(translateForSpeech("Thank you", "af"), "Dankie");
  assert.equal(translateForSpeech("Habari", "sw"), "Habari");
  assert.equal(translateForSpeech("Hello", "en"), "Hello");
});

test("telemetry exports TXT, CSV, and JSON", () => {
  const log = new SessionLog();
  const now = Date.now();
  log.update({
    tokens: [
      { id: "HELLO", label: "Hello", at: now, confidence: 0.98 },
      { id: "MY", label: "My", at: now + 1000, confidence: 0.91 },
    ],
    glosses: ["HELLO", "MY"],
    english: "Hello my",
    language: "ASL",
    sessionStartedAt: now,
  });
  assert.equal(log.count, 2);
  assert.match(log.toTXT(), /Glipter — session transcript/);
  assert.match(log.toTXT(), /HELLO/);
  assert.match(log.toCSV(), /timestamp_iso,elapsed_ms,sign,label,confidence,language/);
  assert.equal(JSON.parse(log.toJSON()).entries.length, 2);
  assert.match(log.toJSON(), /Not validated by Deaf signers/);
});

test("hand SVG renderer produces a 21-point skeleton", () => {
  const hand = makeSyntheticHand(OPEN_HAND);
  const svg = handSvg(hand.map((point) => [point.x, point.y, point.z]));
  assert.match(svg, /^<svg/);
  assert.equal((svg.match(/<circle/g) ?? []).length, 21);
});

test("speech and ASR modules degrade safely when browser APIs are absent", () => {
  assert.equal(canSpeak(), false);
  assert.equal(SpeechInput.supported, false);
  const input = new SpeechInput();
  assert.equal(input.start(), false);
  input.stop();
});

test("sequence spec is present and complete", () => {
  assert.equal(DEFAULT_SEQUENCE_SPEC.targetFrames, 24);
  assert.deepEqual(DEFAULT_SEQUENCE_SPEC.summary, ["mean", "std", "min", "max", "delta", "motion"]);
});

test("rest-pose segmenter starts on a hand and ends after a rest run", () => {
  const segmenter = new RestPoseSegmenter({ restFrames: 2 });
  const hand = makeSyntheticHand(OPEN_HAND);
  const frame = { hands: [{ landmarks: hand }] };
  assert.equal(segmenter.push(frame).started, true);
  assert.equal(segmenter.push(frame).state, "active");
  assert.equal(segmenter.push({ hands: [] }).ended, false);
  assert.equal(segmenter.push({ hands: [] }).ended, true);
  assert.equal(segmenter.active, false);
});

test("community profile schema accepts a reviewed profile contract", () => {
  const valid = validateProfile({
    id: "TEST",
    name: "Test sign language",
    mode: "static",
    priority: 2,
    classify: () => null,
    reorder: () => "",
    note: "A test profile with honest limitations.",
    review: { status: "pending", version: "0.1.0", reviewers: [] },
  });
  assert.equal(valid.ok, true, valid.errors.join("; "));

  const invalid = validateProfile({ id: "bad id", name: "x", mode: "magic", priority: 9 });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.length >= 4);
});

test("bundled language profiles satisfy the community schema", () => {
  const result = validateProfile(ASL);
  assert.equal(result.ok, true, result.errors.join("; "));
});

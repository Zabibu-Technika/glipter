import { getFingerState } from "../lib/fingers.js";
import { ASL_FIXTURES } from "../selftest/fixtures/asl.js";
import { KSL_WORDS_FIXTURES } from "../selftest/fixtures/ksl-words.js";

function toHand(flat) {
  return flat.map(([x, y, z]) => ({ x, y, z }));
}

function handsFromFlat126(flat) {
  const hands = [];
  for (let h = 0; h < 2; h++) {
    const chunk = flat.slice(h * 63, h * 63 + 63);
    if (chunk.every((value) => Math.abs(value) < 1e-9)) continue;
    const landmarks = [];
    for (let i = 0; i < 21; i++) {
      landmarks.push({ x: chunk[i * 3], y: chunk[i * 3 + 1], z: chunk[i * 3 + 2] });
    }
    hands.push({
      landmarks,
      handedness: h === 0 ? "Left" : "Right",
      fingers: getFingerState(landmarks),
    });
  }
  return hands;
}

function makeFrame(hands, extra = {}) {
  const dominant = hands.find((hand) => hand.handedness === "Right") ?? hands[0] ?? null;
  const nonDominant = hands.find((hand) => hand !== dominant) ?? null;
  return {
    hands,
    dominant: dominant ? { ...dominant, fingers: getFingerState(dominant.landmarks) } : null,
    nonDominant: nonDominant ? { ...nonDominant, fingers: getFingerState(nonDominant.landmarks) } : null,
    gesture: null,
    sequenceGesture: null,
    fps: 30,
    latency: 8,
    timestamp: performance.now(),
    ...extra,
  };
}

function pickFixture(letter) {
  return ASL_FIXTURES.find((fixture) => fixture.className === letter);
}

/**
 * Deterministic on-device demo. It replays real landmark samples from the
 * test split through the exact same feature/model/overlay pipeline as the
 * camera. This is what makes the app useful with no camera and no network.
 */
export class DemoPlayer {
  constructor({ onFrame, onStatus, profile } = {}) {
    this.onFrame = onFrame;
    this.onStatus = onStatus;
    this.profile = profile;
    this.running = false;
    this.rafId = 0;
    this.frames = [];
    this.index = 0;
    this.lastAt = 0;
  }

  setProfile(profile) {
    this.profile = profile;
  }

  _buildStaticFrames() {
    const words = [
      ["H", "E", "L", "L", "O"],
      ["M", "Y"],
      ["N", "A", "M", "E"],
    ];
    const frames = [];
    for (const word of words) {
      for (const letter of word) {
        const fixture = pickFixture(letter);
        if (!fixture) continue;
        const landmarks = toHand(fixture.landmarks);
        const hand = {
          landmarks,
          handedness: "Right",
          fingers: getFingerState(landmarks),
        };
        const gesture = this.profile?.classify?.(landmarks, null) ?? null;
        for (let i = 0; i < 13; i++) {
          frames.push(makeFrame([hand], { gesture }));
        }
        // Release the hand so a repeated letter can be signed again.
        for (let i = 0; i < 7; i++) frames.push(makeFrame([]));
      }
      // Explicit word boundary for the demo. Live mode uses a timed pause.
      frames.push({ ...makeFrame([]), commitWord: true });
      for (let i = 0; i < 4; i++) frames.push(makeFrame([]));
    }
    return frames;
  }

  _buildSequenceFrames() {
    const fixture = KSL_WORDS_FIXTURES[0];
    if (!fixture) return this._buildStaticFrames();
    const handsList = fixture.frames.map(handsFromFlat126);
    const frames = [];
    const buffer = [];
    for (let repeat = 0; repeat < 2; repeat++) {
      for (let i = 0; i < handsList.length; i++) {
        const frame = makeFrame(handsList[i]);
        buffer.push(frame);
        if (buffer.length > 60) buffer.shift();
        if (i % 6 === 0 && buffer.length >= 12) {
          frame.sequenceGesture = this.profile?.classifySequence?.(buffer) ?? null;
        }
        frames.push(frame);
      }
      frames.push({ ...makeFrame([]), commitWord: true });
      for (let i = 0; i < 8; i++) frames.push(makeFrame([]));
    }
    return frames;
  }

  start() {
    if (this.running) return;
    this.frames = this.profile?.mode === "sequence"
      ? this._buildSequenceFrames()
      : this._buildStaticFrames();
    this.index = 0;
    this.running = true;
    this.onStatus?.("demo");
    this.lastAt = performance.now();

    const tick = (now) => {
      if (!this.running) return;
      // 30 fps target, with a small allowance for slow devices.
      if (now - this.lastAt >= 33) {
        this.lastAt = now;
        const frame = this.frames[this.index % this.frames.length];
        this.index += 1;
        if (frame) this.onFrame?.(frame);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.frames = [];
    this.index = 0;
    this.onStatus?.("stopped");
  }
}

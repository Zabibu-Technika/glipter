import { getFingerState } from "./fingers.js";
import { LM, handBounds, handCenter, palmSize } from "./landmarks.js";

/**
 * Rule-based phrase and motion layer.
 *
 * The bundled neural models only know static ASL letters and four isolated KSL
 * words. This layer adds the conversational gestures we can recognise without
 * new training data: ILY ("I love you"), HELP, the motion letters J and Z, a
 * HELLO wave, a YES nod, and conservative THANK YOU / PLEASE / SORRY motion
 * rules.
 *
 * It is deliberately conservative. A gesture must match a handshape gate and,
 * for motion signs, a trajectory gate. These are ASL-derived rules, not a
 * Deaf-reviewed KSL lexicon.
 */

const SAMPLE_WINDOW_MS = 1000;
const MIN_SAMPLES = 5;
const MIN_SPAN_MS = 220;
const PENDING_MS = 1250;
const COOLDOWN_MS = 1400;

function fingerState(hand) {
  return hand?.fingers ?? getFingerState(hand?.landmarks ?? []);
}

function isIly(f) {
  return f.thumb && f.index && !f.middle && !f.ring && f.pinky;
}

function isOpen(f) {
  return f.index && f.middle && f.ring && f.pinky;
}

function isFist(f) {
  return !f.index && !f.middle && !f.ring && !f.pinky;
}

function isPinkyOnly(f) {
  return !f.index && !f.middle && !f.ring && f.pinky;
}

function isIndexOnly(f) {
  return f.index && !f.middle && !f.ring && !f.pinky;
}

function directionChanges(values, epsilon) {
  let changes = 0;
  let last = 0;
  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    if (Math.abs(delta) < epsilon) continue;
    const sign = Math.sign(delta);
    if (last && sign !== last) changes += 1;
    last = sign;
  }
  return changes;
}

function range(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function motionSummary(samples, pick) {
  const points = samples.map(pick);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const start = points[0];
  const end = points[points.length - 1];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const path = pathLength(points);
  const closed = points.length > 2
    ? Math.hypot(end.x - start.x, end.y - start.y) / Math.max(1e-6, Math.max(spanX, spanY))
    : 1;
  return {
    start,
    end,
    spanX,
    spanY,
    path,
    closed,
    minY,
    maxY,
    changesX: directionChanges(xs, 0.002),
    changesY: directionChanges(ys, 0.002),
  };
}

export class PhraseRecognizer {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.reset();
  }

  reset() {
    this.samples = [];
    this.pending = null;
    this.lastEmit = null;
    this.lastStatic = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.reset();
  }

  /** True while a motion sign is being attempted, so the static model can wait. */
  isPending() {
    if (!this.pending) return false;
    const now = this._now ?? Date.now();
    if (now - this.pending.at > PENDING_MS) {
      this.pending = null;
      return false;
    }
    return true;
  }

  _emit(id, label, confidence, kind, detail) {
    const now = this._now ?? Date.now();
    if (this.lastEmit && this.lastEmit.id === id && now - this.lastEmit.at < COOLDOWN_MS) {
      return null;
    }
    this.lastEmit = { id, at: now };
    return {
      id,
      label,
      confidence,
      kind,
      detail,
      modelId: "phrase-rules-v1",
    };
  }

  update(frame) {
    if (!this.enabled) return null;
    this._now = frame?.timestamp ?? Date.now();
    const dom = frame?.dominant;
    if (!dom?.landmarks?.length) {
      this.samples = [];
      this.pending = null;
      this.lastStatic = null;
      return null;
    }

    const f = fingerState(dom);
    const bounds = handBounds(dom.landmarks);
    if (bounds.width < 0.06 || bounds.height < 0.06) return null;

    // ILY is a distinctive static handshape and is safe to prefer over the
    // alphabet model, which otherwise tends to answer Y.
    if (isIly(f)) {
      this.lastStatic = {
        id: "ILY",
        label: "I love you",
        confidence: 0.97,
        kind: "static",
        detail: "thumb, index, and pinky extended",
        modelId: "phrase-rules-v1",
      };
      return this.lastStatic;
    }

    // HELP: a fist resting on an open palm. Two hands are required.
    const non = frame?.nonDominant;
    if (isFist(f) && non?.landmarks?.length) {
      const nonFingers = fingerState(non);
      const nonPalm = palmSize(non.landmarks);
      const domWrist = dom.landmarks[LM.WRIST];
      const nonCenter = handCenter(non.landmarks);
      const near = Math.hypot(domWrist.x - nonCenter.x, domWrist.y - nonCenter.y) < nonPalm * 2.6;
      if (isOpen(nonFingers) && near) {
        this.lastStatic = {
          id: "HELP",
          label: "Help",
          confidence: 0.9,
          kind: "static",
          detail: "fist on an open palm",
          modelId: "phrase-rules-v1",
        };
        return this.lastStatic;
      }
    }

    const gate = isPinkyOnly(f)
      ? "J"
      : isIndexOnly(f)
        ? "Z"
        : isOpen(f)
          ? "HELLO"
          : isFist(f)
            ? "YES"
            : null;

    if (!gate) {
      this.samples = [];
      this.pending = null;
      this.lastStatic = null;
      return null;
    }

    if (!this.pending || this.pending.gate !== gate) {
      this.samples = [];
      this.pending = { gate, at: this._now };
    }

    const sample = {
      t: this._now,
      gate,
      center: handCenter(dom.landmarks),
      index: dom.landmarks[LM.INDEX_TIP],
      pinky: dom.landmarks[LM.PINKY_TIP],
      palm: palmSize(dom.landmarks),
      fingers: f,
    };
    this.samples.push(sample);
    this.samples = this.samples.filter((item) => this._now - item.t <= SAMPLE_WINDOW_MS);
    if (this.samples.length > 60) this.samples.shift();

    this.lastStatic = null;
    if (this.samples.length < MIN_SAMPLES) return null;
    const span = this.samples[this.samples.length - 1].t - this.samples[0].t;
    if (span < MIN_SPAN_MS) return null;

    const palm = this.samples.reduce((sum, item) => sum + item.palm, 0) / this.samples.length;
    const center = motionSummary(this.samples, (item) => item.center);
    const result = this._matchMotion(gate, center, palm);
    if (!result) return null;

    this.pending = null;
    this.samples = [];
    return this._emit(result.id, result.label, result.confidence, "motion", result.detail);
  }

  _matchMotion(gate, motion, palm) {
    // J: pinky down, then a left/right hook. Direction is allowed to flip for
    // mirrored cameras; the vertical-and-hook shape is what matters.
    if (gate === "J") {
      const hook = Math.abs(motion.end.x - motion.start.x) > palm * 0.55;
      const down = motion.maxY - motion.start.y > palm * 0.7;
      const curled = motion.end.y < motion.maxY - palm * 0.15;
      if (hook && down && curled && motion.path > palm * 1.2) {
        return {
          id: "J",
          label: "J (motion)",
          confidence: 0.86,
          detail: "pinky traces a J",
        };
      }
      return null;
    }

    // Z: index traces a flat Z — right, diagonal back, right.
    if (gate === "Z") {
      if (
        motion.spanX > palm * 1.1
        && motion.spanY > palm * 0.45
        && motion.changesX >= 2
        && motion.path > palm * 1.9
      ) {
        return {
          id: "Z",
          label: "Z (motion)",
          confidence: 0.84,
          detail: "index traces a Z",
        };
      }
      return null;
    }

    // HELLO: open hand, side-to-side wave with at least two reversals.
    if (gate === "HELLO") {
      if (
        motion.spanX > palm * 0.8
        && motion.changesX >= 2
        && motion.spanY < palm * 1.1
        && motion.path > palm * 1.1
      ) {
        return {
          id: "HELLO",
          label: "Hello",
          confidence: 0.88,
          detail: "open-hand wave",
        };
      }

      // THANK YOU: an open hand moving down and away from the chin. Forward
      // movement is mostly toward the camera and is not visible in 2D, so the
      // conservative evidence is a sustained downward sweep.
      if (
        motion.spanY > palm * 0.85
        && motion.end.y - motion.start.y > palm * 0.35
        && motion.spanX < palm * 2.2
        && motion.changesX < 3
        && motion.path > palm * 1.1
      ) {
        return {
          id: "THANK-YOU",
          label: "Thank you",
          confidence: 0.78,
          detail: "open hand sweeps down",
        };
      }

      // PLEASE: an open palm circling on the chest. Require a closed loop so a
      // wave or a one-way sweep cannot trigger it.
      if (
        motion.changesX + motion.changesY >= 3
        && motion.spanX > palm * 0.45
        && motion.spanY > palm * 0.45
        && motion.spanX < palm * 1.8
        && motion.spanY < palm * 1.6
        && motion.closed < 0.7
        && motion.path > palm * 1.3
      ) {
        return {
          id: "PLEASE",
          label: "Please",
          confidence: 0.76,
          detail: "open palm circles",
        };
      }
      return null;
    }

    // YES: a fist nodding vertically in place. Check SORRY first because a
    // fist circle also changes y twice but has a much wider x span.
    if (gate === "YES") {
      if (
        motion.changesX + motion.changesY >= 3
        && motion.spanX > palm * 0.35
        && motion.spanY > palm * 0.35
        && motion.spanY < palm * 1.4
        && motion.closed < 0.75
        && motion.path > palm * 1.2
      ) {
        return {
          id: "SORRY",
          label: "Sorry",
          confidence: 0.76,
          detail: "fist circles",
        };
      }
      if (
        motion.spanY > palm * 0.7
        && motion.changesY >= 1
        && motion.spanX < palm * 0.5
        && motion.path > palm * 0.9
      ) {
        return {
          id: "YES",
          label: "Yes",
          confidence: 0.82,
          detail: "fist nod",
        };
      }
    }
    return null;
  }
}

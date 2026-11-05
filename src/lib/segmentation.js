/**
 * Lightweight rest-pose segmenter used as the first continuous-signing
 * scaffold. It is deliberately conservative and not a learned boundary model:
 * a segment starts when a hand appears, and ends after a short run of frames
 * with no hands. It gives the temporal buffer clean reset points while the
 * real segmentation dataset is being collected.
 */
export class RestPoseSegmenter {
  constructor({ restFrames = 6, minMotion = 0.004 } = {}) {
    this.restFrames = Math.max(1, restFrames);
    this.minMotion = minMotion;
    this.restCount = 0;
    this.active = false;
    this.previous = null;
    this.lastMotion = 0;
  }

  _handCenter(frame) {
    const hand = frame?.hands?.[0];
    if (!hand?.landmarks?.length) return null;
    let x = 0;
    let y = 0;
    let z = 0;
    for (const point of hand.landmarks) {
      x += point.x;
      y += point.y;
      z += point.z ?? 0;
    }
    const n = hand.landmarks.length;
    return { x: x / n, y: y / n, z: z / n };
  }

  push(frame) {
    const center = this._handCenter(frame);
    const motion = center && this.previous
      ? Math.hypot(center.x - this.previous.x, center.y - this.previous.y, center.z - this.previous.z)
      : 0;
    this.lastMotion = motion;
    this.previous = center;

    if (!center) {
      this.restCount += 1;
      if (this.active && this.restCount >= this.restFrames) {
        this.active = false;
        return { state: "rest", started: false, ended: true, motion: 0 };
      }
      return { state: "rest", started: false, ended: false, motion: 0 };
    }

    this.restCount = 0;
    if (!this.active) {
      this.active = true;
      return { state: "active", started: true, ended: false, motion };
    }
    return { state: "active", started: false, ended: false, motion };
  }

  reset() {
    this.restCount = 0;
    this.active = false;
    this.previous = null;
    this.lastMotion = 0;
  }
}

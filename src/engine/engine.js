import { getFingerState } from "../lib/fingers.js";

const HANDS_BASE = new URL("../../vendor/mediapipe/hands/", import.meta.url);

/**
 * Camera + MediaPipe orchestration.
 *
 * The render loop is deliberately busy-guarded: MediaPipe inference takes
 * tens of milliseconds, while rAF fires at 60 Hz. Without the guard, frames
 * queue and the UI lags seconds behind reality.
 */
export class GlipterEngine {
  constructor({ onFrame, onError, onStatus, maxHands = 2, complexity = 0 } = {}) {
    this.onFrame = onFrame;
    this.onError = onError;
    this.onStatus = onStatus;
    this.maxHands = maxHands;
    this.complexity = complexity;
    this.profile = null;
    this.hands = null;
    this.stream = null;
    this.running = false;
    this.busy = false;
    this.rafId = 0;
    this.frameTimes = [];
    this.sequenceFrames = [];
    this.sequenceStride = 6;
    this.frameCounter = 0;
    this.lastLatency = 0;
    this.minFrameInterval = 0;
    this.lastSentAt = 0;
    this.sendFailures = 0;
    this.gotResults = false;
    this.firstFrameTimer = 0;
    this.video = null;
  }

  setProfile(profile) {
    this.profile = profile;
    this.sequenceFrames = [];
    this.frameCounter = 0;
  }

  resetSequence() {
    this.sequenceFrames = [];
    this.frameCounter = 0;
  }

  setOptions({ complexity, maxHands, minFrameInterval } = {}) {
    if (typeof complexity === "number") this.complexity = complexity;
    if (typeof maxHands === "number") this.maxHands = maxHands;
    if (typeof minFrameInterval === "number") this.minFrameInterval = minFrameInterval;
    if (this.hands) {
      this.hands.setOptions({
        maxNumHands: this.maxHands,
        modelComplexity: this.complexity,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
        selfieMode: false,
      });
    }
  }

  async start(videoEl) {
    if (this.running) return;
    if (!window.Hands) {
      throw new Error("MediaPipe Hands is not loaded. Open Glipter from localhost or HTTPS.");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not expose a camera API. Try Chrome, Edge, or Safari.");
    }

    this.video = videoEl;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });
    videoEl.srcObject = this.stream;
    videoEl.muted = true;
    videoEl.playsInline = true;

    await new Promise((resolve, reject) => {
      if (videoEl.readyState >= 2) return resolve();
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("The camera stream could not be displayed."));
      };
      const cleanup = () => {
        videoEl.removeEventListener("loadeddata", onReady);
        videoEl.removeEventListener("error", onError);
      };
      videoEl.addEventListener("loadeddata", onReady, { once: true });
      videoEl.addEventListener("error", onError, { once: true });
    });

    await videoEl.play();

    this.hands = new window.Hands({
      locateFile: (file) => new URL(file, HANDS_BASE).href,
    });
    this.hands.setOptions({
      maxNumHands: this.maxHands,
      modelComplexity: this.complexity,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: false,
    });
    this.hands.onResults((results) => this._handleResults(results));

    this.running = true;
    this.onStatus?.("running");
    const loop = async () => {
      if (!this.running) return;
      if (videoEl.readyState >= 2 && !this.busy) {
        const now = performance.now();
        if (now - this.lastSentAt < this.minFrameInterval) {
          this.rafId = requestAnimationFrame(loop);
          return;
        }
        this.lastSentAt = now;
        this.busy = true;
        const started = now;
        try {
          await this.hands.send({ image: videoEl });
          this.sendFailures = 0;
        } catch (error) {
          this.sendFailures += 1;
          if (this.sendFailures === 3) {
            this.onError?.(new Error(`MediaPipe failed to process a frame: ${error.message ?? error}`));
          }
          if (this.sendFailures >= 6) {
            this.running = false;
            this.onStatus?.("error");
            this.onError?.(new Error("MediaPipe stopped after repeated frame failures. Try Chrome/Edge with WebGL, or use the demo."));
          }
        } finally {
          this.lastLatency = performance.now() - started;
          this.busy = false;
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
    this.firstFrameTimer = setTimeout(() => {
      if (!this.gotResults && this.running) {
        this.onError?.(new Error("The hand tracker did not produce frames. MediaPipe may need WebGL or a different browser. Try Chrome/Edge, or use the demo."));
      }
    }, 7000);
  }

  _handleResults(res) {
    this.gotResults = true;
    this.sendFailures = 0;
    clearTimeout(this.firstFrameTimer);
    const now = performance.now();
    this.frameTimes.push(now);
    while (this.frameTimes.length && now - this.frameTimes[0] > 2000) this.frameTimes.shift();
    const span = this.frameTimes.length > 1
      ? Math.max(1, now - this.frameTimes[0])
      : 1000;
    const fps = (this.frameTimes.length / span) * 1000;

    const landmarks = res.multiHandLandmarks ?? [];
    const handedness = (res.multiHandedness ?? []).map((h) => h.label);

    if (!landmarks.length) {
      this.sequenceFrames = [];
      this.onFrame?.({
        hands: [],
        dominant: null,
        nonDominant: null,
        gesture: null,
        sequenceGesture: null,
        fps,
        latency: this.lastLatency,
        timestamp: now,
      });
      return;
    }

    const hands = landmarks.map((lm, i) => ({
      landmarks: lm,
      handedness: handedness[i] ?? "Unknown",
      fingers: getFingerState(lm),
    }));

    // Prefer a right hand for one-handed signs. The model also runs mirrored
    // test-time augmentation, so left-handed signers are still covered.
    const domIdx = hands.findIndex((h) => h.handedness === "Right");
    const dom = hands[domIdx >= 0 ? domIdx : 0];
    const nonDom = hands.find((h) => h !== dom) ?? null;

    const frame = {
      hands,
      dominant: dom,
      nonDominant: nonDom,
      gesture: null,
      sequenceGesture: null,
      fps,
      latency: this.lastLatency,
      timestamp: now,
    };

    if (this.profile?.mode === "sequence") {
      this.sequenceFrames.push(frame);
      if (this.sequenceFrames.length > 60) this.sequenceFrames.shift();
      this.frameCounter += 1;
      if (this.frameCounter % this.sequenceStride === 0 && this.sequenceFrames.length >= 12) {
        try {
          frame.sequenceGesture = this.profile.classifySequence(this.sequenceFrames);
        } catch (error) {
          this.onError?.(error);
        }
      }
    } else if (this.profile?.classify) {
      try {
        frame.gesture = this.profile.classify(dom.landmarks, nonDom?.landmarks ?? null);
      } catch (error) {
        this.onError?.(error);
      }
    }

    this.onFrame?.(frame);
  }

  stop() {
    this.running = false;
    clearTimeout(this.firstFrameTimer);
    this.firstFrameTimer = 0;
    this.gotResults = false;
    this.sendFailures = 0;
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video = null;
    this.sequenceFrames = [];
    try {
      this.hands?.close?.();
    } catch {
      // Ignore teardown races.
    }
    this.hands = null;
    this.onStatus?.("stopped");
  }
}

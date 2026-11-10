import { FilesetResolver, HandLandmarker } from "../../vendor/mediapipe/tasks/vision_bundle.mjs";
import { getFingerState } from "../lib/fingers.js";
import { PhraseRecognizer } from "../lib/phraseRecognizer.js";

const TASKS_BASE = new URL("../../vendor/mediapipe/tasks/", import.meta.url);
const MODEL_URL = new URL("hand_landmarker.task", TASKS_BASE).href;
const WASM_BASE = `${new URL("wasm", TASKS_BASE).href}/`;

function isCoarsePointer() {
  try {
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  } catch {
    return false;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    if (canvas.getContext("webgl2")) return 2;
    if (canvas.getContext("webgl")) return 1;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Camera + MediaPipe Tasks orchestration.
 *
 * Uses the modern HandLandmarker task, not the legacy WebGL-only Hands
 * solution. Inference runs on GPU when available and falls back to the WASM
 * CPU delegate, which is the path that works on phones and browsers without a
 * usable WebGL context. The overlay is always Canvas 2D.
 *
 * Frames are downscaled before inference so a 1080p camera does not allocate
 * 1080p GPU textures on a phone.
 */
export class GlipterEngine {
  constructor({
    onFrame,
    onError,
    onStatus,
    onBackend,
    maxHands = 2,
    complexity = 0,
    inference = "auto",
    maxCaptureSize = 0,
  } = {}) {
    this.onFrame = onFrame;
    this.onError = onError;
    this.onStatus = onStatus;
    this.onBackend = onBackend;
    this.maxHands = maxHands;
    this.complexity = complexity;
    this.inference = inference;
    this.maxCaptureSize = maxCaptureSize || (isCoarsePointer() ? 640 : 960);
    this.profile = null;
    this.landmarker = null;
    this.fileset = null;
    this.delegate = null;
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
    this.detectFailures = 0;
    this.gotResults = false;
    this.firstFrameTimer = 0;
    this.video = null;
    this.captureCanvas = null;
    this.captureCtx = null;
    this.phrase = new PhraseRecognizer();
  }

  get backend() {
    return {
      delegate: this.delegate,
      webgl: this.webglVersion ?? 0,
      capture: this.captureCanvas
        ? { width: this.captureCanvas.width, height: this.captureCanvas.height }
        : null,
    };
  }

  setProfile(profile) {
    this.profile = profile;
    this.sequenceFrames = [];
    this.frameCounter = 0;
    this.phrase.setEnabled(profile?.mode !== "sequence");
  }

  resetSequence() {
    this.sequenceFrames = [];
    this.frameCounter = 0;
  }

  setOptions({ complexity, maxHands, minFrameInterval, inference, maxCaptureSize } = {}) {
    if (typeof complexity === "number") this.complexity = complexity;
    if (typeof maxHands === "number") this.maxHands = maxHands;
    if (typeof minFrameInterval === "number") this.minFrameInterval = minFrameInterval;
    if (typeof inference === "string") this.inference = inference;
    if (typeof maxCaptureSize === "number" && maxCaptureSize > 0) this.maxCaptureSize = maxCaptureSize;
  }

  _cameraConstraints() {
    const mobile = isCoarsePointer();
    const width = this.maxCaptureSize <= 480 ? 480 : mobile ? 640 : 960;
    const height = this.maxCaptureSize <= 480 ? 360 : mobile ? 480 : 720;
    return {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: this.maxCaptureSize <= 480 ? 15 : 30 },
        facingMode: "user",
      },
      audio: false,
    };
  }

  async _createLandmarker(delegate) {
    return HandLandmarker.createFromOptions(this.fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: "VIDEO",
      numHands: this.maxHands,
      minHandDetectionConfidence: this.maxCaptureSize <= 480 ? 0.5 : 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.55,
    });
  }

  async _createWithFallback() {
    this.fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const requested = this.inference === "cpu"
      ? ["CPU"]
      : this.inference === "gpu"
        ? ["GPU"]
        : (this.hasWebGL ? ["GPU", "CPU"] : ["CPU"]);

    let lastError = null;
    for (const delegate of requested) {
      try {
        this.landmarker = await this._createLandmarker(delegate);
        this.delegate = delegate;
        this.onBackend?.(this.backend);
        return;
      } catch (error) {
        lastError = error;
        this.landmarker = null;
      }
    }
    throw new Error(
      `The hand model could not start on ${requested.join(" or ")}. ${lastError?.message ?? ""}`.trim(),
    );
  }

  async _switchToCpu() {
    if (this.delegate === "CPU" || !this.fileset) return false;
    try {
      this.landmarker?.close?.();
      this.landmarker = null;
      this.landmarker = await this._createLandmarker("CPU");
      this.delegate = "CPU";
      this.detectFailures = 0;
      this.onBackend?.(this.backend);
      this.onError?.(new Error("GPU inference failed; switched to the CPU/WASM backend."));
      return true;
    } catch (error) {
      this.onError?.(new Error(`CPU fallback failed: ${error.message ?? error}`));
      return false;
    }
  }

  async start(videoEl) {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not expose a camera API. Try Chrome, Edge, or Safari.");
    }

    this.video = videoEl;
    this.onStatus?.("starting");
    this.stream = await navigator.mediaDevices.getUserMedia(this._cameraConstraints());
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

    this.captureCanvas = document.createElement("canvas");
    this.captureCanvas.width = this.maxCaptureSize;
    this.captureCanvas.height = Math.round(this.maxCaptureSize * 0.75);
    this.captureCtx = this.captureCanvas.getContext("2d", { alpha: false, desynchronized: true });
    this.webglVersion = supportsWebGL();
    this.hasWebGL = this.webglVersion > 0;

    this.onStatus?.("loading");
    await this._createWithFallback();
    if (!this.hasWebGL) this.onStatus?.("no-webgl");

    this.running = true;
    this.onStatus?.("running");
    this.gotResults = false;
    this.firstFrameTimer = setTimeout(() => {
      if (!this.gotResults && this.running) {
        this.onError?.(new Error(
          "The hand tracker did not produce frames. Try the CPU backend in Settings, or use the demo.",
        ));
      }
    }, 8000);

    const loop = () => {
      if (!this.running) return;
      if (videoEl.readyState >= 2 && !this.busy) {
        const now = performance.now();
        if (now - this.lastSentAt >= this.minFrameInterval) {
          this.lastSentAt = now;
          this.busy = true;
          const started = now;
          try {
            this._captureFrame(videoEl);
            const result = this.landmarker.detectForVideo(this.captureCanvas, now);
            this.detectFailures = 0;
            this._handleResults(result, now);
          } catch (error) {
            this.detectFailures += 1;
            this.sendFailures += 1;
            if (this.detectFailures === 2) {
              this._switchToCpu().catch(() => {});
            }
            if (this.sendFailures === 4) {
              this.onError?.(new Error(`MediaPipe failed to process a frame: ${error.message ?? error}`));
            }
            if (this.sendFailures >= 8) {
              this.running = false;
              this.onStatus?.("error");
              this.onError?.(new Error(
                this.hasWebGL
                  ? "The hand tracker stopped after repeated failures. Try CPU inference in Settings, or use the demo."
                  : "This browser cannot create a WebGL context, which MediaPipe needs to read camera frames. Use the demo or phrase board, or enable hardware acceleration.",
              ));
            }
          } finally {
            this.lastLatency = performance.now() - started;
            this.busy = false;
          }
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  _captureFrame(videoEl) {
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 480;
    const max = this.maxCaptureSize;
    let width;
    let height;
    if (vw >= vh) {
      width = Math.min(max, vw);
      height = Math.max(1, Math.round((width * vh) / vw));
    } else {
      height = Math.min(max, vh);
      width = Math.max(1, Math.round((height * vw) / vh));
    }
    if (this.captureCanvas.width !== width || this.captureCanvas.height !== height) {
      this.captureCanvas.width = width;
      this.captureCanvas.height = height;
    }
    this.captureCtx.drawImage(videoEl, 0, 0, width, height);
  }

  _handleResults(res, now) {
    this.gotResults = true;
    this.sendFailures = 0;
    clearTimeout(this.firstFrameTimer);

    this.frameTimes.push(now);
    while (this.frameTimes.length && now - this.frameTimes[0] > 2000) this.frameTimes.shift();
    const span = this.frameTimes.length > 1
      ? Math.max(1, now - this.frameTimes[0])
      : 1000;
    const fps = (this.frameTimes.length / span) * 1000;

    const landmarks = res.landmarks ?? [];
    const handednessRaw = res.handednesses ?? res.handedness ?? [];
    const handedness = handednessRaw.map((list) => {
      const category = Array.isArray(list) ? list[0] : list;
      return category?.categoryName ?? category?.displayName ?? category?.label ?? "Unknown";
    });

    if (!landmarks.length) {
      this.sequenceFrames = [];
      this.phrase.update({ hands: [], timestamp: now });
      this.onFrame?.({
        hands: [],
        dominant: null,
        nonDominant: null,
        gesture: null,
        sequenceGesture: null,
        phrase: null,
        motionPending: false,
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
    const domIdx = hands.findIndex((hand) => hand.handedness === "Right");
    const dom = hands[domIdx >= 0 ? domIdx : 0];
    const nonDom = hands.find((hand) => hand !== dom) ?? null;

    const frame = {
      hands,
      dominant: dom,
      nonDominant: nonDom,
      gesture: null,
      sequenceGesture: null,
      phrase: null,
      motionPending: false,
      fps,
      latency: this.lastLatency,
      timestamp: now,
      backend: this.delegate,
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
    } else {
      if (this.profile?.classify) {
        try {
          frame.gesture = this.profile.classify(dom.landmarks, nonDom?.landmarks ?? null);
        } catch (error) {
          this.onError?.(error);
        }
      }
      try {
        frame.phrase = this.phrase.update(frame);
        frame.motionPending = this.phrase.isPending();
        if (frame.phrase) {
          // ILY and HELP are deliberately preferred over the alphabet model.
          frame.gesture = frame.phrase;
        } else if (frame.motionPending) {
          // A J/Z/H E L L O/YES attempt is in progress; do not commit the
          // static letter that shares its starting handshape.
          frame.gesture = null;
        }
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
    this.detectFailures = 0;
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video = null;
    this.sequenceFrames = [];
    this.phrase.reset();
    try {
      this.landmarker?.close?.();
    } catch {
      // Ignore teardown races.
    }
    this.landmarker = null;
    this.fileset = null;
    this.onStatus?.("stopped");
  }
}

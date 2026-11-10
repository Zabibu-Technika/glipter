import createEspeak from "../../vendor/tts/espeak/espeak-ng.js";
import { TTS_LANGUAGES } from "../text/spokenLanguages.js";
export { TTS_LANGUAGES };

/**
 * Embedded multilingual voice: eSpeak NG compiled to WebAssembly.
 *
 * It is bundled with the app and runs entirely on-device. The engine covers
 * Swahili, Afrikaans, Amharic, Setswana, Oromo, Tigrinya, and many others.
 * eSpeak NG is GPL-3.0; its licence and source notice live in vendor/tts/espeak.
 */

export const ESPEAK_LANGUAGES = TTS_LANGUAGES;

let modulePromise = null;
let worker = null;
let audioContext = null;
let currentSource = null;
let currentEnd = null;
let speaking = false;
let loaded = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function espeakSupported() {
  return typeof window !== "undefined"
    && typeof WebAssembly !== "undefined"
    && typeof (window.AudioContext || window.webkitAudioContext) === "function";
}

export function isEspeakLoaded() {
  return loaded;
}

function getAudioContext() {
  if (!espeakSupported()) return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx({ latencyHint: "interactive" });
  }
  return audioContext;
}

export async function unlockEspeakAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

export async function preloadEspeak() {
  if (!modulePromise) {
    modulePromise = createEspeak().then((module) => {
      worker = new module.eSpeakNGWorker();
      loaded = true;
      return module;
    }).catch((error) => {
      modulePromise = null;
      loaded = false;
      throw error;
    });
  }
  return modulePromise;
}

export async function synthesizeEspeak(text, { lang = "sw", rate = 1, pitch = 1 } = {}) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
  if (!clean) throw new Error("Nothing to speak.");
  await preloadEspeak();
  if (!worker) throw new Error("The multilingual voice did not initialise.");

  const voiceResult = worker.set_voice(lang || "sw");
  if (voiceResult !== 0 && voiceResult !== undefined) {
    // Fall back to Swahili, then English, if a requested voice is unavailable.
    if (worker.set_voice("sw") !== 0) worker.set_voice("en");
  }
  worker.set_rate(Math.round(175 * clamp(Number(rate) || 1, 0.6, 1.6)));
  worker.set_pitch(Math.round(50 * clamp(Number(pitch) || 1, 0.6, 1.6)));

  const chunks = [];
  worker.synthesize(clean, (data) => {
    if (data?.length) chunks.push(new Int16Array(data));
    return false; // 0 = continue synthesis
  });
  if (!chunks.length) throw new Error("The multilingual voice produced no audio.");

  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const samples = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      samples[offset + i] = chunk[i] / 32768;
    }
    offset += chunk.length;
  }
  return { samples, sampleRate: worker.get_samplerate() || 22050 };
}

function stopSource() {
  if (currentSource) {
    try {
      currentSource.onended = null;
      currentSource.stop();
    } catch {
      // Already stopped.
    }
    currentSource = null;
  }
  const end = currentEnd;
  currentEnd = null;
  speaking = false;
  if (end) end();
}

export async function speakEspeak(text, { lang = "sw", rate = 1, pitch = 1, onStart, onEnd } = {}) {
  if (!espeakSupported()) throw new Error("This browser cannot play embedded audio.");
  stopSource();
  const ctx = getAudioContext();
  if (!(await unlockEspeakAudio())) throw new Error("Audio is locked until you interact with the page.");
  const { samples, sampleRate } = await synthesizeEspeak(text, { lang, rate, pitch });
  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  buffer.copyToChannel(samples, 0);
  stopSource();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    if (currentSource === source) {
      currentSource = null;
      speaking = false;
      currentEnd = null;
      onEnd?.();
    }
  };
  currentSource = source;
  currentEnd = onEnd ?? null;
  speaking = true;
  onStart?.();
  source.start();
  return true;
}

export function stopEspeak() {
  stopSource();
}

export function isEspeakSpeaking() {
  return speaking;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    unlockEspeakAudio().finally(() => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    });
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

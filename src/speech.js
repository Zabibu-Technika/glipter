/**
 * Text-to-speech.
 *
 * The default voice is embedded: eSpeak NG compiled to WebAssembly, shipped
 * with the app, rendered in the browser, and played through Web Audio. It
 * needs no OS voice, no speechSynthesis, and no network. It covers English,
 * Kiswahili, Afrikaans, Amharic, Setswana, Oromo, Tigrinya, and many more.
 *
 * The device's speechSynthesis voices remain an optional fallback.
 */
import {
  espeakSupported,
  isEspeakLoaded,
  isEspeakSpeaking,
  preloadEspeak,
  speakEspeak,
  stopEspeak,
  unlockEspeakAudio,
} from "./tts/espeak.js";

let cachedVoices = [];
let lastSpoken = "";
let lastSpokenAt = 0;
const voiceListeners = new Set();

export function canUseSystemTts() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function canSpeak() {
  return espeakSupported() || canUseSystemTts();
}

export function usesEmbeddedTts() {
  return espeakSupported();
}

export function embeddedVoiceStatus() {
  return {
    multilingual: espeakSupported(),
    multilingualLoaded: isEspeakLoaded(),
  };
}

export function refreshVoices() {
  if (!canUseSystemTts()) return [];
  try {
    cachedVoices = window.speechSynthesis.getVoices() ?? [];
  } catch {
    cachedVoices = [];
  }
  for (const listener of voiceListeners) listener(cachedVoices.slice());
  return cachedVoices.slice();
}

export function getVoices() {
  return cachedVoices.slice().sort((a, b) => {
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function onVoicesChanged(listener) {
  voiceListeners.add(listener);
  return () => voiceListeners.delete(listener);
}

export function localVoiceCount() {
  return getVoices().filter((voice) => voice.localService).length;
}

export function preferredVoice(voiceURI) {
  const voices = getVoices();
  if (voiceURI) {
    const exact = voices.find((voice) => voice.voiceURI === voiceURI);
    if (exact) return exact;
  }
  return voices.find((voice) => voice.localService && /^en/i.test(voice.lang))
    ?? voices.find((voice) => voice.localService)
    ?? voices.find((voice) => /^en/i.test(voice.lang))
    ?? voices[0]
    ?? null;
}

function speakSystem(text, {
  voiceURI = "",
  rate = 0.95,
  pitch = 1,
  onStart,
  onEnd,
} = {}) {
  if (!canUseSystemTts()) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredVoice(voiceURI);
    if (voice) utterance.voice = voice;
    utterance.rate = Math.max(0.5, Math.min(2, Number(rate) || 0.95));
    utterance.pitch = Math.max(0.5, Math.min(2, Number(pitch) || 1));
    utterance.volume = 1;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

export function speak(text, {
  enabled = true,
  engine = "espeak",
  lang = "en",
  voiceURI = "",
  rate = 0.95,
  pitch = 1,
  force = false,
  onStart,
  onEnd,
} = {}) {
  if (!enabled || !canSpeak()) return false;
  const clean = String(text ?? "").trim();
  if (!clean) return false;

  const now = Date.now();
  if (!force && clean === lastSpoken && now - lastSpokenAt < 1200) return false;
  lastSpoken = clean;
  lastSpokenAt = now;

  // Older builds stored "embedded" for the Flite engine. Treat it as the
  // embedded eSpeak engine so persisted settings keep working.
  const selected = engine === "embedded" ? "espeak" : engine;

  if (selected === "system" && canUseSystemTts()) {
    const sent = speakSystem(clean, { voiceURI, rate, pitch, onStart, onEnd });
    if (sent) return true;
  }

  if (espeakSupported()) {
    speakEspeak(clean, { lang, rate, pitch, onStart, onEnd }).catch(() => {
      speakSystem(clean, { voiceURI, rate, pitch, onStart, onEnd });
    });
    return true;
  }

  return speakSystem(clean, { voiceURI, rate, pitch, onStart, onEnd });
}

export function stopSpeaking() {
  stopEspeak();
  if (canUseSystemTts()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore.
    }
  }
}

export function isSpeaking() {
  return isEspeakSpeaking()
    || (canUseSystemTts() && window.speechSynthesis.speaking);
}

export function warmEmbeddedVoice() {
  return preloadEspeak();
}

export function unlockTtsAudio() {
  return unlockEspeakAudio();
}

if (canUseSystemTts()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  // Some browsers populate voices only after the first call.
  setTimeout(refreshVoices, 0);
  setTimeout(refreshVoices, 400);
}

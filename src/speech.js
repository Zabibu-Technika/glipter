/**
 * Text-to-speech (TTS) using the device's speech synthesiser.
 *
 * Prefers a local voice so the feature can work offline. Browsers expose
 * voices asynchronously; call refreshVoices() on voiceschanged.
 */
let cachedVoices = [];
let lastSpoken = "";
let lastSpokenAt = 0;
const voiceListeners = new Set();

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function refreshVoices() {
  if (!canSpeak()) return [];
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

export function speak(text, {
  enabled = true,
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

  try {
    const utterance = new SpeechSynthesisUtterance(clean);
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
    return false;
  }
}

export function stopSpeaking() {
  if (canSpeak()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore.
    }
  }
}

export function isSpeaking() {
  return canSpeak() && window.speechSynthesis.speaking;
}

if (canSpeak()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  // Some browsers populate voices only after the first call.
  setTimeout(refreshVoices, 0);
  setTimeout(refreshVoices, 400);
}

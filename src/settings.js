const STORAGE_KEY = "glipter.settings.v2";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "studio",
  textSize: "normal",
  highContrast: false,
  reduceMotion: false,
  mirror: true,
  skeleton: true,
  complexity: 0,
  threshold: 0.55,
  minMargin: 0.08,
  wordGapMs: 2200,
  inference: "auto",
  speech: false,
  ttsEngine: "espeak",
  ttsLang: "en",
  voiceURI: "",
  ttsRate: 0.95,
  asrLang: "en-US",
  haptics: true,
  lowPower: false,
});

let current = { ...DEFAULT_SETTINGS };
const listeners = new Set();
let mediaTheme = null;

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function systemPrefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function effectiveTheme() {
  if (current.theme === "system") return systemPrefersDark() ? "dark" : "light";
  return current.theme;
}

function apply() {
  const root = document.documentElement;
  root.dataset.theme = effectiveTheme();
  root.dataset.textSize = current.textSize;
  root.dataset.contrast = current.highContrast ? "high" : "normal";
  root.dataset.motion = current.reduceMotion || systemPrefersReducedMotion() ? "reduced" : "full";

  const theme = effectiveTheme();
  const themeColor = theme === "dark" ? "#070b14" : theme === "studio" ? "#f4ecff" : "#f3f6fb";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);

  for (const listener of listeners) listener({ ...current });
}

export function getSettings() {
  return { ...current };
}

export function updateSettings(patch, { persist = true } = {}) {
  current = { ...current, ...patch };
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // Private browsing or storage disabled: settings still apply this session.
    }
  }
  apply();
  return getSettings();
}

export function resetSettings() {
  current = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
  apply();
  return getSettings();
}

export function onSettingsChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initSettings() {
  current = { ...DEFAULT_SETTINGS, ...readStored() };
  if (current.ttsEngine === "embedded") current.ttsEngine = "espeak";
  apply();

  if (mediaTheme) mediaTheme.removeEventListener("change", apply);
  mediaTheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  mediaTheme?.addEventListener?.("change", apply);

  const motionMedia = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  motionMedia?.addEventListener?.("change", apply);

  return getSettings();
}

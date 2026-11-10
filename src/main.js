import { GlipterEngine } from "./engine/engine.js";
import { DemoPlayer, DEMO_SENTENCE } from "./engine/demo.js";
import { GestureDebouncer } from "./lib/debouncer.js";
import { drawHands, clearOverlay } from "./lib/overlay.js";
import { TextAccumulator } from "./text/accumulator.js";
import { LANGUAGES, DEFAULT_LANGUAGE_ID, getById, listForMenu } from "./languages/registry.js";
import { runSelfTest } from "./selftest/runner.js";
import {
  initSettings,
  getSettings,
  updateSettings,
  resetSettings,
} from "./settings.js";
import { SessionLog, downloadText, formatDuration } from "./telemetry.js";
import { initPWA } from "./pwa.js";
import {
  speak,
  stopSpeaking,
  canSpeak,
  canUseSystemTts,
  usesEmbeddedTts,
  getVoices,
  localVoiceCount,
  onVoicesChanged,
  refreshVoices,
  preferredVoice,
} from "./speech.js";
import { SpeechInput } from "./asr.js";
import {
  $, $$, setText, escapeHTML, handSvg, prototypeFor, alphabetLetters,
  renderLearnGrid, renderTranscript, renderSelfTest, renderDatasetList,
  renderTop3, toast, pct,
} from "./ui.js";
import { PHRASE_LABELS, phraseForText, phraseLabel } from "./text/phrases.js";
import {
  SPOKEN_LANGUAGES,
  quickPhrasesFor,
  spokenLanguage,
  spokenLanguageOptions,
  translateForSpeech,
  ttsLanguageLabel,
} from "./text/spokenLanguages.js";

/* ── State ──────────────────────────────────────────────────── */
let settings = initSettings();
let profile = getById(DEFAULT_LANGUAGE_ID);
let engine = null;
let demo = null;
let accumulator = null;
let asr = null;
let sessionLog = new SessionLog();
let selfTestResult = null;
let currentView = "live";
let currentLearnLang = "ASL";
let currentLearnLetter = "A";
let lastGestureId = null;
let lastPrediction = null;
let lastPredictionAt = 0;
let lastSequenceAt = 0;
let lastTop3Signature = "";
let lastSpokenTokenCount = 0;
let lastAnnouncedTokenCount = 0;
let lastMotionAt = 0;
let lastAsrFinal = "";
let talkMessages = [];
let lastTalkSignAt = 0;
let correctionTarget = null;
let speechTimer = 0;
let pwa = null;
let installAvailable = false;
let frameCount = 0;
let commandIndex = 0;
let commandItems = [];
let practiceMode = false;
let practiceTargetLetter = "A";
let practiceCompleted = [];
let practiceAdvanceTimer = 0;
let practiceDebouncer = new GestureDebouncer(8, 5);
let transcriptQuery = "";
let transcriptMinConfidence = 0;
let sessionClockStartedAt = null;
let sessionClockStoppedAt = null;
let onboardingStep = 0;
let kioskMode = false;

const debouncer = new GestureDebouncer(10, 6);
const sequenceDebouncer = new GestureDebouncer(8, 4);
function haptic(pattern = [12]) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are best-effort.
  }
}

function flashCommit() {
  if (!els.currentSign) return;
  setSignalRing("committed");
  els.currentSign.classList.remove("is-committed");
  void els.currentSign.offsetWidth;
  els.currentSign.classList.add("is-committed");
  setTimeout(() => {
    els.currentSign?.classList.remove("is-committed");
    if (engine || demo) setSignalRing("found");
    else setSignalRing("idle");
  }, 520);
}

const LETTER_HINTS = {
  A: "Fist, thumb resting alongside the index finger.",
  B: "Flat hand, fingers together, thumb across the palm.",
  C: "Curved hand, like holding a small ball — a C shape.",
  D: "Index up; other fingertips touch the thumb.",
  E: "Fingers curled, thumb tucked across them.",
  F: "Thumb and index pinch; middle, ring, and pinky up.",
  G: "Index and thumb parallel, pointing sideways.",
  H: "Index and middle together, pointing sideways.",
  I: "Pinky up, other fingers closed.",
  J: "Pinky up, then trace a J in the air (motion).",
  K: "Index and middle up, thumb between them.",
  L: "Thumb and index form an L.",
  M: "Three fingers folded over the thumb.",
  N: "Two fingers folded over the thumb.",
  O: "Fingers curved into an O.",
  P: "Like K, pointing downward.",
  Q: "Like G, pointing downward.",
  R: "Index and middle crossed.",
  S: "Fist with the thumb across the front.",
  T: "Thumb tucked between index and middle.",
  U: "Index and middle together, pointing up.",
  V: "Index and middle apart in a V.",
  W: "Three fingers up, thumb holding the pinky.",
  X: "Index hooked, other fingers closed.",
  Y: "Thumb and pinky out, other fingers closed.",
  Z: "Index traces a Z in the air (motion).",
};

/* ── Elements ───────────────────────────────────────────────── */
const els = {
  video: $("video"),
  overlay: $("overlay"),
  languageBtn: $("language-btn"),
  languageSummary: $("language-summary"),
  languageDialog: $("language-dialog"),
  spokenLanguageSelect: $("spoken-language-select"),
  languageApply: $("language-apply"),
  correctionDialog: $("correction-dialog"),
  correctionInput: $("correction-input"),
  correctionSave: $("correction-save"),
  cameraPanel: $("camera-panel"),
  cameraMore: $("camera-more"),
  cameraMenu: $("camera-menu"),
  cameraSettings: $("camera-settings"),
  cameraFacing: $("camera-facing"),
  cameraKiosk: $("camera-kiosk"),
  detailsBtn: $("details-btn"),
  detailsDrawer: $("details-drawer"),
  detailsBackdrop: $("details-backdrop"),
  detailsClose: $("details-close"),
  presentBtn: $("present-btn"),
  threadExpand: $("thread-expand"),
  liveCaptionLang: $("live-caption-lang"),
  cameraStage: $("camera-stage"),
  cameraPlaceholder: $("camera-placeholder"),
  cameraStatus: $("camera-status"),
  engineStatus: $("engine-status"),
  liveChip: $("live-chip"),
  fps: $("fps"),
  latency: $("latency"),
  engineBackend: $("engine-backend"),
  handCount: $("hand-count"),
  handLabel: $("hand-label"),
  errorBanner: $("error-banner"),
  errorText: $("error-text"),
  errorRetry: $("error-retry"),
  errorDismiss: $("error-dismiss"),
  practiceBanner: $("practice-banner"),
  practiceTarget: $("practice-target"),
  practiceFeedback: $("practice-feedback"),
  practiceProgress: $("practice-progress"),
  practiceExit: $("practice-exit"),
  startBtn: $("start-btn"),
  stopBtn: $("stop-btn"),
  demoBtn: $("demo-btn"),
  mirrorToggle: $("mirror-toggle"),
  skeletonToggle: $("skeleton-toggle"),
  languageSelect: $("language-select"),
  workspaceTitle: $("workspace-title"),
  modelPill: $("model-pill"),
  currentSign: $("current-sign"),
  currentLabel: $("current-label"),
  signState: $("sign-state"),
  inspectorToggle: $("inspector-toggle"),
  inspectorToggleLabel: $("inspector-toggle-label"),
  inspectorDetails: $("inspector-details"),
  confidenceBar: $("confidence-bar"),
  confidenceValue: $("confidence-value"),
  top3: $("top3"),
  glossStream: $("gloss-stream"),
  englishStream: $("english-stream"),
  spokenTranslation: $("spoken-translation"),
  speakBtn: $("speak-btn"),
  copyBtn: $("copy-btn"),
  clearBtn: $("clear-btn"),
  undoBtn: $("undo-btn"),
  exportBtn: $("export-btn"),
  statTokens: $("stat-tokens"),
  statWords: $("stat-words"),
  statDuration: $("stat-duration"),
  statModel: $("stat-model"),
  languageNote: $("language-note"),
  timeline: $("timeline"),
  timelineEmpty: $("timeline-empty"),
  timelineCount: $("timeline-count"),
  clearTimeline: $("clear-timeline"),
  talkMode: $("talk-mode"),
  talkClear: $("talk-clear"),
  talkQuick: $("talk-quick"),
  talkThread: $("talk-thread"),
  talkEmpty: $("talk-empty"),
  talkSignPreview: $("talk-sign-preview"),
  talkForm: $("talk-form"),
  talkInput: $("talk-input"),
  talkListen: $("talk-listen"),
  talkSpeak: $("talk-speak"),
  talkAutoSpeak: $("talk-auto-speak"),
  transcriptList: $("transcript-list"),
  transcriptEmpty: $("transcript-empty"),
  transcriptCount: $("transcript-count"),
  transcriptDuration: $("transcript-duration"),
  transcriptLanguage: $("transcript-language"),
  transcriptSearch: $("transcript-search"),
  transcriptConfidence: $("transcript-confidence"),
  transcriptFilterCount: $("transcript-filter-count"),
  learnGrid: $("learn-grid"),
  learnFilter: $("learn-filter"),
  learnLanguage: $("learn-language"),
  learnSvg: $("learn-svg"),
  learnTitleSign: $("learn-title-sign"),
  learnNote: $("learn-note"),
  learnSource: $("learn-source"),
  learnConfidence: $("learn-confidence"),
  learnPractice: $("learn-practice"),
  practiceHeroLetter: $("practice-hero-letter"),
  practiceHeroStart: $("practice-hero-start"),
  typeToSignInput: $("type-to-sign-input"),
  typeToSignOutput: $("type-to-sign-output"),
  datasetList: $("dataset-list"),
  modelCards: $("model-cards"),
  selfTestBadge: $("self-test-badge"),
  statusSelfTest: $("status-self-test"),
  signAnnouncer: $("sign-announcer"),
  selfTestTitle: $("self-test-title"),
  selfTestDetails: $("self-test-details"),
  offlineBadge: $("offline-badge"),
  offlineText: $("offline-text"),
  statusOffline: $("status-offline"),
  installBtn: $("install-btn"),
  settingsBtn: $("settings-btn"),
  railSettings: $("rail-settings"),
  settingsDialog: $("settings-dialog"),
  settingTheme: $("setting-theme"),
  settingTextSize: $("setting-text-size"),
  settingContrast: $("setting-contrast"),
  settingMotion: $("setting-motion"),
  settingMirror: $("setting-mirror"),
  settingSkeleton: $("setting-skeleton"),
  settingComplexity: $("setting-complexity"),
  settingInference: $("setting-inference"),
  settingThreshold: $("setting-threshold"),
  settingThresholdValue: $("setting-threshold-value"),
  settingMargin: $("setting-margin"),
  settingMarginValue: $("setting-margin-value"),
  settingWordGap: $("setting-word-gap"),
  settingWordGapValue: $("setting-word-gap-value"),
  settingSpeech: $("setting-speech"),
  settingTtsEngine: $("setting-tts-engine"),
  settingTtsLang: $("setting-tts-lang"),
  settingVoice: $("setting-voice"),
  settingRate: $("setting-rate"),
  settingRateValue: $("setting-rate-value"),
  settingHaptics: $("setting-haptics"),
  settingLowPower: $("setting-low-power"),
  settingKiosk: $("setting-kiosk"),
  settingOnboarding: $("setting-onboarding"),
  settingsReset: $("settings-reset"),
  settingVoiceView: $("setting-voice-view"),
  settingAboutView: $("setting-about-view"),
  sessionClock: $("session-clock"),
  statusModel: $("status-model"),
  statusFps: $("status-fps"),
  statusLatency: $("status-latency"),
  appMain: $("main"),
  commandBtn: $("command-btn"),
  commandDialog: $("command-dialog"),
  commandInput: $("command-input"),
  commandList: $("command-list"),
  commandHint: $("command-hint"),
  onboardingDialog: $("onboarding-dialog"),
  onboardingKicker: $("onboarding-kicker"),
  onboardingBack: $("onboarding-back"),
  onboardingNext: $("onboarding-next"),
  onboardingSkip: $("onboarding-skip"),
  onboardingDemo: $("onboarding-demo"),
  onboardingStart: $("onboarding-start"),
  onboardingSteps: $$("[data-onboarding-step]"),
  onboardingDots: $$(".onboarding-dots span"),
  kioskExit: $("kiosk-exit"),
  asrSupport: $("asr-support"),
  ttsSupport: $("tts-support"),
  asrLang: $("asr-lang"),
  asrToggle: $("asr-toggle"),
  asrClear: $("asr-clear"),
  asrTranscript: $("asr-transcript"),
  asrStatus: $("asr-status"),
  asrWave: $("asr-wave"),
  asrToSpeak: $("asr-to-speak"),
  asrCopy: $("asr-copy"),
  asrSpeak: $("asr-speak"),
  asrNote: $("asr-note"),
  asrNetwork: $("asr-network"),
  asrUseText: $("asr-use-text"),
  ttsText: $("tts-text"),
  ttsEngine: $("tts-engine"),
  ttsLang: $("tts-lang"),
  ttsVoice: $("tts-voice"),
  ttsRate: $("tts-rate"),
  ttsRateValue: $("tts-rate-value"),
  ttsSpeak: $("tts-speak"),
  ttsStop: $("tts-stop"),
  ttsCopy: $("tts-copy"),
  ttsNote: $("tts-note"),
  quickPhrases: $("quick-phrases"),
  heroStart: $("hero-start"),
};

const ctx = els.overlay.getContext("2d", { alpha: true });

/* ── Language ───────────────────────────────────────────────── */
function fillLanguageSelect() {
  const compact = window.innerWidth <= 700;
  els.languageSelect.innerHTML = listForMenu().map((language) => {
    const label = compact ? language.shortName : language.name;
    return `<option value="${escapeHTML(language.id)}">${escapeHTML(label)}</option>`;
  }).join("");
  els.languageSelect.value = profile.id;
  els.languageSelect.title = profile.name;
}

function languageLearnKey(language) {
  if (language.id === "ASL") return "ASL";
  if (language.id === "KSL" || language.id === "KSL-WORDS") return "KSL";
  return "BSL";
}

function applyLanguage(next, { initial = false } = {}) {
  const changed = next.id !== profile.id;
  if (changed && practiceMode) stopPractice({ silent: true });
  profile = next;
  els.languageSelect.value = profile.id;
  els.languageSelect.title = profile.name;
  engine?.setProfile(profile);
  demo?.setProfile(profile);
  debouncer.reset();
  sequenceDebouncer.reset();
  lastGestureId = null;
  lastPrediction = null;
  lastPredictionAt = 0;
  lastSequenceAt = 0;

  if (accumulator) {
    accumulator.setProfile(profile);
    if (changed) accumulator.clear();
  }
  if (changed) {
    sessionLog.clear();
    resetLiveReadout();
  }

  setText(els.workspaceTitle, profile.name);
  setText(els.modelPill, profile.shortName);
  setText(els.statModel, profile.shortName);
  setText(els.statusModel, profile.shortName);
  if (els.languageNote) {
    const metrics = profile.metrics ?? {};
    const metricText = typeof metrics.top1 === "number"
      ? `Held-out top-1 ${pct(metrics.top1)} on ${metrics.testSamples ?? "—"} samples.`
      : "Rule-based · no public benchmark bundled.";
    els.languageNote.textContent = `${profile.note} ${metricText}`;
  }

  currentLearnLang = languageLearnKey(profile);
  syncLearnFilter();
  if (currentView === "learn") {
    renderLearnGrid(els.learnGrid, currentLearnLang);
    selectLearn(currentLearnLetter, currentLearnLang, { render: false });
  }
  renderStatsFromAccumulator();
  renderTranscriptView();
  renderTimeline();

  if (!initial && changed) toast(`Language: ${profile.name}`, { type: "success" });
  updateLanguageSummary();
}

/* ── Spoken language, used across the whole app ───────────── */
function fillSpokenLanguageSelect() {
  const options = spokenLanguageOptions().map((language) =>
    `<option value="${escapeHTML(language.code)}">${escapeHTML(language.label)}</option>`).join("");
  for (const select of [els.spokenLanguageSelect, els.ttsLang, els.settingTtsLang]) {
    if (!select) continue;
    select.innerHTML = options;
    select.value = settings.ttsLang;
  }
}

function fillAsrLanguages() {
  if (!els.asrLang) return;
  const options = SPOKEN_LANGUAGES.map((language) =>
    `<option value="${escapeHTML(language.asr)}">${escapeHTML(language.label)}</option>`).join("");
  els.asrLang.innerHTML = options;
  els.asrLang.value = settings.asrLang;
  if (!els.asrLang.value) {
    els.asrLang.value = "en-US";
    settings = updateSettings({ asrLang: "en-US" });
  }
}

function updateLanguageSummary() {
  const spoken = spokenLanguage(settings.ttsLang);
  setText(els.languageSummary, `${profile.shortName} · ${spoken.label}`);
  setText(els.liveCaptionLang, `${profile.shortName} → ${spoken.label}`);
  if (els.languageBtn) {
    const summary = `${profile.shortName} · ${spoken.label}`;
    els.languageBtn.title = `Languages: ${summary}. Sign: ${profile.name}. Speak: ${spoken.english}.`;
    els.languageBtn.setAttribute("aria-label", `Languages: ${summary}`);
  }
}

function renderTalkQuickPhrases() {
  if (!els.talkQuick) return;
  els.talkQuick.innerHTML = quickPhrasesFor(settings.ttsLang).map((phrase) =>
    `<button class="quick-phrase" type="button" data-talk-phrase="${escapeHTML(phrase)}">${escapeHTML(phrase)}</button>`).join("");
}

function renderVoiceQuickPhrases() {
  if (!els.quickPhrases) return;
  els.quickPhrases.innerHTML = quickPhrasesFor(settings.ttsLang).map((phrase) =>
    `<button class="quick-phrase" type="button" data-phrase="${escapeHTML(phrase)}">${escapeHTML(phrase)}</button>`).join("");
}

/**
 * One spoken-language choice updates the embedded voice, speech recognition,
 * quick phrases, and the speech-to-sign preview.
 */
function updateSpokenTranslation(english = els.englishStream?.textContent) {
  if (!els.spokenTranslation) return;
  const text = String(english ?? "").trim();
  const spoken = translateForSpeech(text, settings.ttsLang);
  const show = text && spoken && spoken.toLowerCase() !== text.toLowerCase();
  setText(els.spokenTranslation, show ? `Spoken: ${spoken}` : "");
}

function applySpokenLanguage(code, { persist = true, announce = false } = {}) {
  const language = spokenLanguage(code);
  if (persist) {
    settings = updateSettings({
      ttsLang: language.code,
      ttsEngine: "espeak",
      asrLang: language.asr,
    });
  } else {
    settings = getSettings();
  }
  if (els.spokenLanguageSelect) els.spokenLanguageSelect.value = language.code;
  if (els.settingTtsLang) els.settingTtsLang.value = language.code;
  if (els.ttsLang) els.ttsLang.value = language.code;
  if (els.asrLang) els.asrLang.value = language.asr;
  asr?.setLang(language.asr);
  fillSpokenLanguageSelect();
  fillAsrLanguages();
  renderTalkQuickPhrases();
  renderVoiceQuickPhrases();
  populateVoices();
  updateLanguageSummary();
  updateTalkMode();
  updateSpokenTranslation();
  if (announce) {
    toast(`Conversation language: ${language.label}`, { type: "success", duration: 2600 });
  }
}

function openLanguageDialog() {
  if (!els.languageDialog) return;
  fillLanguageSelect();
  fillSpokenLanguageSelect();
  if (els.languageSelect) els.languageSelect.value = profile.id;
  if (els.spokenLanguageSelect) els.spokenLanguageSelect.value = settings.ttsLang;
  els.languageDialog.showModal();
}

function bindLanguageDialog() {
  els.languageBtn?.addEventListener("click", openLanguageDialog);
  els.languageApply?.addEventListener("click", () => {
    const nextProfile = getById(els.languageSelect?.value ?? profile.id);
    if (nextProfile.id !== profile.id) applyLanguage(nextProfile);
    applySpokenLanguage(els.spokenLanguageSelect?.value ?? settings.ttsLang, { announce: true });
    els.languageDialog?.close();
  });
  els.languageDialog?.addEventListener("click", (event) => {
    if (event.target === els.languageDialog) els.languageDialog.close();
  });
}

/* ── Reference & learn ──────────────────────────────────────── */
function syncLearnFilter() {
  $$("[data-learn-lang]", els.learnFilter).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.learnLang === currentLearnLang);
  });
}

function selectLearn(letter, language, { render = true, view = false } = {}) {
  currentLearnLang = language;
  currentLearnLetter = letter;
  setText(els.practiceHeroLetter, letter);
  setText(els.learnLanguage, language);
  if (els.practiceHeroStart) {
    els.practiceHeroStart.disabled = language === "BSL";
    els.practiceHeroStart.title = language === "BSL" ? "Practice is available for ASL/KSL handshape modes." : "";
  }
  syncLearnFilter();
  if (render) {
    renderLearnGrid(els.learnGrid, language);
    $$("[data-letter]", els.learnGrid).forEach((card) => {
      card.classList.toggle("is-active", card.dataset.letter === letter && card.dataset.language === language);
    });
  }
  renderLearnDetail(letter, language);
  renderTypeToSign();
  if (view) showView("learn", { scroll: true });
}

function renderLearnDetail(letter, language) {
  const prototype = prototypeFor(language, letter);
  setText(els.learnTitleSign, letter);
  if (!prototype) {
    els.learnSvg.innerHTML = `<div class="empty-state" style="padding:18px"><div class="empty-icon"><svg class="icon" aria-hidden="true"><use href="#i-hand"></use></svg></div><h3>Rule-based</h3><p>${escapeHTML(language)} reference landmarks are not bundled.</p></div>`;
    setText(els.learnSource, "rule-based");
    setText(els.learnConfidence, "—");
    setText(els.learnNote, language === "BSL"
      ? "BSL is two-handed and experimental. This build recognises only A, B, L, and V with geometric rules; a permissively licensed BSL landmark corpus is still needed."
      : "No prototype is bundled for this language yet.");
    if (els.learnPractice) {
      els.learnPractice.disabled = language === "BSL";
      els.learnPractice.textContent = language === "BSL" ? "Unavailable" : "Practise";
    }
    return;
  }

  els.learnSvg.innerHTML = handSvg(prototype.landmarks, { label: `${language} ${letter}` });
  setText(els.learnSource, prototype.source ?? "training sample");
  let confidenceText = "reference only";
  try {
    const reference = getById(language);
    const landmarks = prototype.landmarks.map(([x, y, z]) => ({ x, y, z }));
    const prediction = reference.classify?.(landmarks, null);
    if (prediction?.confidence) confidenceText = "reference only";
  } catch {
    confidenceText = "reference only";
  }
  setText(els.learnConfidence, confidenceText);
  const hint = LETTER_HINTS[letter] ?? "";
  const context = language === "KSL"
    ? "ASL-based reference. KSL review pending."
    : language === "ASL"
      ? "ASL reference."
      : "Reference sample.";
  setText(els.learnNote, `${hint} ${context}`.trim());
  if (els.learnPractice) {
    els.learnPractice.disabled = language === "BSL";
    els.learnPractice.textContent = `Practise`;
  }
}

function openLearnForLetter(letter, language) {
  selectLearn(letter, language, { view: true });
}

function renderTypeToSign() {
  if (!els.typeToSignOutput) return;
  if (currentLearnLang === "BSL") {
    els.typeToSignOutput.innerHTML = `<div class="glyph-note">Gliptic Typography is available for the ASL/KSL handshape library. BSL has no bundled landmarks yet.</div>`;
    return;
  }
  const text = String(els.typeToSignInput?.value ?? "").toUpperCase();
  const glyphs = [...text].map((character) => {
    if (character === " ") return `<span class="glyph is-space" aria-hidden="true">·</span>`;
    const prototype = prototypeFor(currentLearnLang, character);
    if (!prototype) return `<span class="glyph is-unsupported"><strong>${escapeHTML(character)}</strong></span>`;
    return `<div class="glyph" title="${escapeHTML(character)}">${handSvg(prototype.landmarks, { label: `${character} handshape`, decorative: true })}<strong>${escapeHTML(character)}</strong></div>`;
  });
  els.typeToSignOutput.innerHTML = glyphs.join("") || `<div class="glyph-note">Type a word to see handshape glyphs.</div>`;
}

function practiceLetters() {
  return alphabetLetters(currentLearnLang);
}

function updatePracticeUI() {
  const letters = practiceLetters();
  setText(els.practiceTarget, practiceTargetLetter);
  setText(els.practiceProgress, `${practiceCompleted.length} / ${letters.length}`);
}

function startPractice(letter) {
  if (currentLearnLang === "BSL") {
    toast("Practice is available for ASL/KSL handshape modes. BSL is rule-based and experimental.", { type: "info", duration: 4200 });
    return;
  }
  const next = getById(currentLearnLang);
  if (profile.id !== next.id) applyLanguage(next);
  practiceMode = true;
  practiceTargetLetter = letter || practiceLetters()[0] || "A";
  practiceCompleted = [];
  practiceDebouncer.reset();
  clearTimeout(practiceAdvanceTimer);
  updatePracticeUI();
  setText(els.practiceFeedback, `Show ${practiceTargetLetter} to the camera.`);
  els.practiceFeedback.className = "practice-feedback";
  els.practiceBanner?.classList.remove("hidden");
  showView("live");
  if (!engine && !demo) {
    setText(els.practiceFeedback, "Start the camera.");
    toast("Start the camera to practise.", { type: "info", duration: 2600 });
  }
}

function stopPractice({ silent = false } = {}) {
  practiceMode = false;
  practiceCompleted = [];
  clearTimeout(practiceAdvanceTimer);
  practiceDebouncer.reset();
  els.practiceBanner?.classList.add("hidden");
  if (!silent) toast("Practice ended.", { type: "info", duration: 1800 });
}

function handlePractice(prediction) {
  if (!prediction) {
    practiceDebouncer.push(null, 0);
    return;
  }
  const result = practiceDebouncer.push(prediction.id, prediction.confidence);
  if (!result.gesture || result.confidence < settings.threshold) return;

  if (result.gesture === practiceTargetLetter) {
    if (!practiceCompleted.includes(practiceTargetLetter)) {
      practiceCompleted.push(practiceTargetLetter);
      haptic([18, 40, 18]);
      flashCommit();
      setText(els.practiceFeedback, `✓ ${practiceTargetLetter} — nice.`);
      els.practiceFeedback.className = "practice-feedback is-success";
      updatePracticeUI();
    }
    clearTimeout(practiceAdvanceTimer);
    practiceAdvanceTimer = setTimeout(() => {
      if (!practiceMode) return;
      const letters = practiceLetters();
      if (!letters.length) return;
      const index = Math.max(0, letters.indexOf(practiceTargetLetter));
      practiceTargetLetter = letters[(index + 1) % letters.length];
      practiceDebouncer.reset();
      setText(els.practiceFeedback, `Show ${practiceTargetLetter} to the camera.`);
      els.practiceFeedback.className = "practice-feedback";
      updatePracticeUI();
    }, 850);
  } else if (result.confidence >= 0.75) {
    setText(els.practiceFeedback, `Saw ${result.gesture}. Try ${practiceTargetLetter}.`);
    els.practiceFeedback.className = "practice-feedback is-wrong";
    haptic([8, 28, 8]);
    practiceDebouncer.reset();
  }
}

/* ── Views ──────────────────────────────────────────────────── */
const VIEWS = ["live", "transcript", "learn", "voice", "about"];

function showView(name, { scroll = true } = {}) {
  if (!VIEWS.includes(name)) return;
  currentView = name;
  for (const view of VIEWS) {
    $(`view-${view}`)?.classList.toggle("hidden", view !== name);
  }
  $$(".rail-item[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === name);
  });
  if (name === "transcript") renderTranscriptView();
  if (name === "learn") {
    renderLearnGrid(els.learnGrid, currentLearnLang);
    selectLearn(currentLearnLetter, currentLearnLang, { render: false });
  }
  if (name === "about") {
    renderDatasetList(els.datasetList, LANGUAGES);
    renderModelCards();
    renderSelfTest(els.selfTestBadge, els.selfTestTitle, els.selfTestDetails, selfTestResult);
    updateSelfTestStatus();
  }
  if (name === "voice") {
    populateVoices();
  }
  if (name !== "live") closeDetails();
  history.replaceState(null, "", `#${name}`);
  if (scroll) els.appMain?.scrollTo({ top: 0, behavior: settings.reduceMotion ? "auto" : "smooth" });
}

function enterKiosk() {
  kioskMode = true;
  document.body.classList.add("kiosk");
  showView("live", { scroll: false });
  document.documentElement.requestFullscreen?.().catch(() => {});
  toast("Kiosk mode. Press Escape or the exit button to leave.", { type: "info", duration: 3000 });
}

function exitKiosk() {
  kioskMode = false;
  document.body.classList.remove("kiosk");
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  toast("Kiosk mode ended.", { type: "info", duration: 1800 });
}

/* ── Frame handling ────────────────────────────────────────── */
function displayPrediction(prediction, now) {
  const holdMs = profile.mode === "sequence" ? 900 : 320;
  let shown = prediction;
  if (!shown && lastPrediction && now - lastPredictionAt < holdMs) shown = lastPrediction;
  if (!shown) lastPrediction = null;

  setText(els.currentSign, shown?.id ?? "—");
  setText(els.currentLabel, shown?.label ?? "no sign");
  els.currentSign.classList.toggle("is-active", Boolean(shown));
  els.currentSign.classList.toggle("is-empty", !shown);
  const confidence = shown?.confidence ?? 0;
  els.confidenceBar.style.width = `${Math.round(confidence * 100)}%`;
  const confidenceState = !shown ? "idle" : confidence >= 0.8 ? "high" : confidence >= settings.threshold ? "mid" : "low";
  if (shown) setSignalRing(confidence >= 0.8 ? "committed" : "committing");
  else setSignalRing(els.handCount.textContent === "0" ? "idle" : "found");
  els.confidenceBar.dataset.state = confidenceState;
  els.confidenceValue.dataset.state = confidenceState;
  setText(els.confidenceValue, shown ? pct(confidence) : "—");
  if (els.signState) {
    let stateText = "Ready.";
    if (shown) {
      stateText = confidence >= 0.8
        ? "Got it."
        : confidence >= settings.threshold
          ? "Hold steady."
          : "Not sure.";
    } else if (engine || demo) {
      stateText = "Show your hand.";
    }
    setText(els.signState, stateText);
    els.signState.className = `sign-state ${confidenceState}`;
  }
  const top3Signature = shown?.top3
    ?.map((candidate) => `${candidate.id}:${Math.round(candidate.confidence * 100)}`)
    .join("|") ?? "";
  if (top3Signature !== lastTop3Signature) {
    lastTop3Signature = top3Signature;
    renderTop3(els.top3, shown);
  }
}

function pushStaticGesture(prediction) {
  const result = debouncer.push(prediction?.id ?? null, prediction?.confidence ?? 0);
  const margin = prediction?.top3?.length > 1
    ? prediction.top3[0].confidence - prediction.top3[1].confidence
    : 1;
  if (result.gesture) {
    if (result.confidence >= settings.threshold && margin >= settings.minMargin && result.gesture !== lastGestureId) {
      lastGestureId = result.gesture;
      const label = prediction?.id === result.gesture
        ? prediction.label
        : phraseLabel(result.gesture);
      accumulator.push({ id: result.gesture, confidence: result.confidence, label });
      haptic([12]);
      flashCommit();
    }
  } else if (lastGestureId !== null) {
    lastGestureId = null;
    accumulator.push(null);
  }
}

function pushMotionGesture(prediction) {
  if (!prediction) return;
  const now = performance.now();
  if (now - lastMotionAt < 900) return;
  lastMotionAt = now;
  lastGestureId = prediction.id;
  debouncer.reset();
  accumulator.push({
    id: prediction.id,
    confidence: prediction.confidence,
    label: prediction.label,
  });
  haptic([16, 40, 16]);
  flashCommit();
  toast(`Signed: ${prediction.label}`, { type: "success", duration: 1800 });
}

function pushSequenceGesture(prediction) {
  if (!prediction) return;
  const result = sequenceDebouncer.push(prediction.id, prediction.confidence);
  const now = performance.now();
  if (result.gesture && result.confidence >= settings.threshold && now - lastSequenceAt > 1700) {
    lastSequenceAt = now;
    accumulator.push({ id: result.gesture, confidence: result.confidence });
    haptic([16, 40, 16]);
    flashCommit();
    sequenceDebouncer.reset();
    engine?.resetSequence?.();
    toast(`Signed: ${profile.labels?.[result.gesture] ?? result.gesture}`, { type: "success", duration: 1800 });
  }
}

function handleFrame(frame) {
  frameCount += 1;
  drawHands(ctx, frame.hands, {
    mirror: settings.mirror,
    showSkeleton: settings.skeleton,
    showLabels: true,
  });

  if (frame.commitWord) {
    accumulator.commitWord();
    accumulator.emit();
  }

  setText(els.fps, frame.fps ? frame.fps.toFixed(0) : "—");
  setText(els.latency, frame.latency ? frame.latency.toFixed(0) : "—");
  const handCount = frame.hands?.length ?? 0;
  setText(els.handCount, handCount);
  setText(els.handLabel, handCount === 1 ? "hand" : "hands");
  setText(els.statusFps, frame.fps ? frame.fps.toFixed(0) : "—");
  setText(els.statusLatency, frame.latency ? frame.latency.toFixed(0) : "—");

  const now = performance.now();
  const prediction = profile.mode === "sequence" ? frame.sequenceGesture : frame.gesture;
  if (prediction) {
    lastPrediction = prediction;
    lastPredictionAt = now;
  }
  displayPrediction(prediction, now);

  if (frame.motionPending) {
    // A motion sign is in progress; keep the live readout quiet rather than
    // showing the starting letter (e.g. I before J, or Z before Z motion).
    if (!frame.phrase) displayPrediction(null, now);
    return;
  }

  if (frame.phrase?.kind === "motion") {
    displayPrediction(frame.phrase, now);
    pushMotionGesture(frame.phrase);
    return;
  }

  if (practiceMode) {
    handlePractice(prediction);
    return;
  }

  if (profile.mode === "sequence") {
    if (frame.sequenceGesture) pushSequenceGesture(frame.sequenceGesture);
  } else {
    pushStaticGesture(frame.gesture);
  }
}

/* ── Camera / demo ─────────────────────────────────────────── */
function syncCanvasToVideo() {
  if (!els.video || !els.overlay) return;
  const width = els.video.videoWidth;
  const height = els.video.videoHeight;
  if (width > 0 && height > 0 && (els.overlay.width !== width || els.overlay.height !== height)) {
    els.overlay.width = width;
    els.overlay.height = height;
  }
}

function setCameraStatus(status, label = status) {
  if (els.cameraStatus) {
    els.cameraStatus.classList.remove("running", "error");
    if (status === "running" || status === "demo" || status === "loading") els.cameraStatus.classList.add("running");
    if (status === "error") els.cameraStatus.classList.add("error");
    els.cameraStatus.innerHTML = `<span class="status-dot"></span> ${escapeHTML(label)}`;
  }
  if (els.engineStatus) {
    els.engineStatus.classList.remove("running", "error");
    if (status === "running" || status === "demo" || status === "loading") els.engineStatus.classList.add("running");
    if (status === "error") els.engineStatus.classList.add("error");
    els.engineStatus.innerHTML = `<span class="status-dot"></span> ${escapeHTML(label)}`;
  }
}

function friendlyCameraError(error) {
  const name = error?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was denied. Allow camera access in the browser, then retry.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera was found. Connect a camera, or use the on-device demo.";
  if (name === "NotReadableError" || name === "TrackStartError") return "The camera is busy or cannot be read. Close other camera apps, then retry.";
  if (name === "OverconstrainedError") return "This camera does not support the requested resolution. Try another camera or browser.";
  if (name === "NotSupportedError") return "This browser or context cannot access a camera. Use HTTPS/localhost and a modern browser, or use the demo.";
  return error?.message ?? String(error);
}

function showError(message) {
  setText(els.errorText, `⚠ ${message}`);
  els.errorBanner?.classList.remove("hidden");
  setCameraStatus("error", "problem");
  toast(message, { type: "error", duration: 5000 });
}

function clearError() {
  els.errorBanner?.classList.add("hidden");
  setText(els.errorText, "");
}

function closeCameraMenu() {
  els.cameraMenu?.classList.add("hidden");
  els.cameraMore?.setAttribute("aria-expanded", "false");
}

function setSignalRing(state) {
  if (!els.cameraPanel) return;
  els.cameraPanel.dataset.signal = state;
}

function openDetails() {
  if (!els.detailsDrawer) return;
  els.detailsDrawer.classList.remove("is-closed");
  els.detailsDrawer.setAttribute("aria-hidden", "false");
  els.detailsBackdrop?.classList.remove("hidden");
  els.detailsBtn?.setAttribute("aria-expanded", "true");
  els.detailsClose?.focus?.();
}

function closeDetails() {
  if (!els.detailsDrawer) return;
  els.detailsDrawer.classList.add("is-closed");
  els.detailsDrawer.setAttribute("aria-hidden", "true");
  els.detailsBackdrop?.classList.add("hidden");
  els.detailsBtn?.setAttribute("aria-expanded", "false");
}

function togglePresent() {
  const on = !document.body.classList.contains("present");
  document.body.classList.toggle("present", on);
  els.presentBtn?.setAttribute("aria-pressed", String(on));
  if (els.presentBtn) setText(els.presentBtn, on ? "Exit present" : "Present");
  toast(on ? "Present mode: the conversation is larger for the hearing partner." : "Present mode off.", { type: "info", duration: 2400 });
}

function cycleThreadSheet() {
  if (!els.threadExpand) return;
  const states = ["peek", "half", "full"];
  const panel = els.threadExpand.closest(".conversation-panel");
  const current = panel?.dataset.sheet ?? "half";
  const next = states[(states.indexOf(current) + 1) % states.length];
  if (panel) panel.dataset.sheet = next;
  els.threadExpand.setAttribute("aria-expanded", String(next === "full"));
  els.threadExpand.setAttribute("aria-label", next === "full" ? "Collapse conversation" : "Expand conversation");
  toast(`Conversation ${next}.`, { type: "info", duration: 1200 });
}

function toggleFaceToFace() {
  const on = !document.body.classList.contains("face-to-face");
  document.body.classList.toggle("face-to-face", on);
  toast(on ? "Face-to-face mode: the conversation is rotated for the person across the table." : "Face-to-face mode off.", { type: "info", duration: 3000 });
}

function toggleCameraMenu() {
  if (!els.cameraMenu || !els.cameraMore) return;
  const open = els.cameraMenu.classList.contains("hidden");
  els.cameraMenu.classList.toggle("hidden", !open);
  els.cameraMore.setAttribute("aria-expanded", String(open));
}

function setRunningUI(running) {
  els.startBtn.disabled = running;
  els.stopBtn.disabled = !running;
  els.cameraPanel?.classList.toggle("is-running", running);
  els.cameraPanel?.classList.toggle("is-idle", !running);
  els.liveChip.classList.toggle("hidden", !running);
  els.cameraPlaceholder.classList.toggle("hidden", running);
  if (!running) closeCameraMenu();
}

function resetLiveReadout() {
  setText(els.currentSign, "—");
  setText(els.currentLabel, "no sign");
  els.currentSign.classList.remove("is-active");
  els.currentSign.classList.add("is-empty");
  els.confidenceBar.style.width = "0%";
  els.confidenceBar.dataset.state = "idle";
  els.confidenceValue.dataset.state = "idle";
  setText(els.confidenceValue, "—");
  setText(els.englishStream, "");
  setText(els.spokenTranslation, "");
  setSignalRing("idle");
  setText(els.signState, "Ready.");
  if (els.signState) els.signState.className = "sign-state idle";
  els.top3.innerHTML = "";
  lastTop3Signature = "";
  setText(els.fps, "—");
  setText(els.latency, "—");
  setText(els.handCount, "0");
  setText(els.handLabel, "hands");
  setText(els.statusFps, "—");
  setText(els.statusLatency, "—");
  frameCount = 0;
  lastPrediction = null;
  lastPredictionAt = 0;
}

function stopEverything({ silent = false, keepPractice = false } = {}) {
  if (practiceMode && !keepPractice) stopPractice({ silent: true });
  engine?.stop();
  engine = null;
  demo?.stop();
  demo = null;
  asr?.stop();
  setAsrButton(false);
  setAsrStatus(SpeechInput.supported ? "idle" : "unsupported");
  debouncer.reset();
  sequenceDebouncer.reset();
  lastGestureId = null;
  lastSequenceAt = 0;
  lastMotionAt = 0;
  accumulator.setAutoCommit(true);
  accumulator.setReorderEnabled(true);
  setRunningUI(false);
  els.cameraStage.classList.remove("is-active");
  clearError();
  clearOverlay(ctx);
  resetLiveReadout();
  stopSessionClock();
  setCameraStatus("idle", "camera off");
  if (els.engineBackend) setText(els.engineBackend, "detector");
  stopSpeaking();
  if (!silent) toast("Stopped.", { type: "info", duration: 1800 });
}

async function startCamera() {
  if (!window.isSecureContext || location.protocol === "file:") {
    showError("Camera access needs HTTPS or localhost. Use `npm run serve`, or open the deployed HTTPS URL. The demo and learn mode still work offline.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showError("This browser does not expose a camera API. Try Chrome, Edge, or Safari.");
    return;
  }
  if (engine) {
    if (engine.running) return;
    engine.stop();
    engine = null;
  }

  showView("live");
  asr?.stop();
  setAsrButton(false);
  setAsrStatus(SpeechInput.supported ? "idle" : "unsupported");
  demo?.stop();
  demo = null;
  clearError();
  setRunningUI(true);
  setCameraStatus("starting", "starting…");
  els.startBtn.disabled = true;

  try {
    engine = new GlipterEngine({
      onFrame: handleFrame,
      onError: (error) => showError(error.message ?? String(error)),
      complexity: settings.lowPower ? 0 : settings.complexity,
      maxHands: settings.lowPower ? 1 : 2,
      inference: settings.inference,
      maxCaptureSize: settings.lowPower ? 480 : (window.matchMedia?.("(pointer: coarse)").matches ? 640 : 960),
      onBackend: (backend) => {
        if (els.engineBackend) {
          const label = backend?.delegate === "GPU"
            ? "GPU"
            : backend?.webgl
              ? `CPU·GL${backend.webgl}`
              : "CPU·noGL";
          setText(els.engineBackend, label);
          els.engineBackend.title = backend?.capture
            ? `${backend.delegate} delegate · WebGL ${backend.webgl || "unavailable"} · ${backend.capture.width}×${backend.capture.height} capture · Canvas 2D overlay`
            : "Hand detector backend";
        }
      },
      onStatus: (status) => {
        if (status === "loading") setCameraStatus("loading", "preparing…");
        if (status === "running") {
          setCameraStatus("running", "live");
          els.liveChip.classList.remove("hidden");
        }
        if (status === "cpu-fallback") {
          toast("GPU inference failed. Glipter switched to CPU/WASM.", { type: "info", duration: 4200 });
        }
        if (status === "no-webgl") {
          setText(els.engineBackend, "no WebGL");
          toast("This browser has no WebGL context. The demo, phrase board, and TTS still work; camera hand tracking needs a WebGL-capable browser.", { type: "info", duration: 6200 });
        }
        if (status === "stopped") setCameraStatus("idle", "camera off");
        if (status === "error") {
          setCameraStatus("error", "problem");
          setRunningUI(false);
        }
      },
    });
    engine.setProfile(profile);
    engine.setOptions({
      minFrameInterval: settings.lowPower ? 66 : 0,
      inference: settings.inference,
      maxCaptureSize: settings.lowPower ? 480 : (window.matchMedia?.("(pointer: coarse)").matches ? 640 : 960),
    });
    await engine.start(els.video);
    syncCanvasToVideo();
    debouncer.reset();
    sequenceDebouncer.reset();
    lastGestureId = null;
    lastSequenceAt = 0;
    els.cameraStage.classList.toggle("mirror", settings.mirror);
    els.cameraStage.classList.add("is-active");
    startSessionClock();
    setText(els.signState, "Show your hand.");
    if (els.signState) els.signState.className = "sign-state idle";
    if (practiceMode) {
      setText(els.practiceFeedback, `Show ${practiceTargetLetter} to the camera.`);
      els.practiceFeedback.className = "practice-feedback";
    }
    toast("Camera on.", { type: "success", duration: 1800 });
  } catch (error) {
    engine?.stop();
    engine = null;
    setRunningUI(false);
    els.startBtn.disabled = false;
    showError(friendlyCameraError(error));
  }
}

function startDemo() {
  stopEverything({ silent: true, keepPractice: true });
  clearSession({ silent: true });
  accumulator.setAutoCommit(false);
  accumulator.setReorderEnabled(false);
  showView("live");
  clearError();
  setRunningUI(true);
  setCameraStatus("demo", "demo");
  els.liveChip.classList.remove("hidden");
  els.cameraPlaceholder.classList.add("hidden");
  demo = new DemoPlayer({
    onFrame: handleFrame,
    onStatus: (status) => {
      if (status === "demo") setCameraStatus("demo", "demo");
      if (status === "stopped") setCameraStatus("idle", "camera off");
      if (status === "complete") {
        stopEverything({ silent: true, keepPractice: true });
        accumulator.emit();
        setText(els.signState, `Demo complete — “${DEMO_SENTENCE}”.`);
        els.signState.className = "sign-state high";
        toast(`Demo complete: ${DEMO_SENTENCE}.`, { type: "success", duration: 4200 });
      }
    },
    profile,
  });
  demo.start();
  els.cameraStage.classList.add("is-active");
  startSessionClock();
  setText(els.signState, "Waiting for a sign — hold one hand in frame.");
  if (els.signState) els.signState.className = "sign-state idle";
  if (practiceMode) {
    setText(els.practiceFeedback, `Show ${practiceTargetLetter} to the camera.`);
    els.practiceFeedback.className = "practice-feedback";
  }
  toast("Demo playing.", { type: "success", duration: 1800 });
}

/* ── Accumulator, timeline, stats ──────────────────────────── */
function scheduleSpeech(english) {
  if (!settings.speech || !english) return;
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    speak(translateForSpeech(english, settings.ttsLang), {
      enabled: settings.speech,
      engine: settings.ttsEngine,
      lang: settings.ttsLang,
      voiceURI: settings.voiceURI,
      rate: settings.ttsRate,
    });
  }, 650);
}

function renderTranscriptView() {
  const result = renderTranscript(els.transcriptList, els.transcriptEmpty, sessionLog, {
    query: transcriptQuery,
    minConfidence: transcriptMinConfidence,
  });
  setText(els.transcriptFilterCount, `${result.visible} of ${result.total}`);
}

function renderTimeline() {
  const entries = sessionLog.entries;
  setText(els.timelineCount, `${entries.length} sign${entries.length === 1 ? "" : "s"}`);
  if (!entries.length) {
    els.timelineEmpty?.classList.remove("hidden");
    els.timeline?.classList.add("hidden");
    if (els.timeline) els.timeline.innerHTML = "";
    return;
  }
  els.timelineEmpty?.classList.add("hidden");
  els.timeline?.classList.remove("hidden");
  if (els.timeline) {
    els.timeline.innerHTML = entries.slice(-14).map((entry) => {
      const elapsed = Math.max(0, entry.at - (sessionLog.state.startedAt ?? entry.at));
      const shown = entry.label && entry.label !== entry.id ? entry.label : entry.id;
      return `<div class="timeline-item" title="${escapeHTML(entry.label ?? entry.id)} · ${pct(entry.confidence, 0)}">
        <span class="time">${formatDuration(elapsed)}</span>
        <span class="sign">${escapeHTML(shown)}</span>
        <span class="conf">${pct(entry.confidence, 0)}</span>
      </div>`;
    }).join("");
    els.timeline.scrollLeft = els.timeline.scrollWidth;
  }
}

/* ── Two-way conversation ─────────────────────────────────── */
function updateTalkMode() {
  if (!els.talkMode) return;
  const listening = asr?.listening;
  const offline = !navigator.onLine;
  const localAsr = SpeechInput.localRecognitionSupported;
  els.talkMode.classList.toggle("is-error", offline && !localAsr);
  if (listening) setText(els.talkMode, "Listening…");
  else if (offline) setText(els.talkMode, localAsr ? "Offline · mic may work" : "Offline · quick replies");
  else setText(els.talkMode, localAsr ? "Mic ready" : "Mic may need internet");
}

function addTalkMessage(role, text, { label = "", update = false, uncertain = [], lang = "" } = {}) {
  const clean = String(text ?? "").trim();
  if (!clean) return;
  const translation = role === "sign" ? translateForSpeech(clean, settings.ttsLang) : "";
  const showTranslation = translation && translation.toLowerCase() !== clean.toLowerCase();
  const chip = lang || (role === "sign"
    ? profile.shortName
    : role === "spoken"
      ? spokenLanguage(settings.ttsLang).label
      : "Glipter");
  const now = Date.now();
  if (role === "sign" && update && talkMessages.length) {
    const last = talkMessages[talkMessages.length - 1];
    if (last.role === "sign" && now - lastTalkSignAt < 7000) {
      last.text = clean;
      last.label = label || last.label;
      last.translation = showTranslation ? translation : "";
      last.uncertain = uncertain;
      last.lang = chip;
      last.at = now;
      lastTalkSignAt = now;
      renderTalkThread();
      return;
    }
  }
  talkMessages.push({
    role,
    text: clean,
    label,
    translation: showTranslation ? translation : "",
    uncertain,
    lang: chip,
    at: now,
  });
  if (talkMessages.length > 40) talkMessages.shift();
  if (role === "sign") lastTalkSignAt = now;
  renderTalkThread();
}

function messageTextHTML(message, index) {
  const uncertain = new Set((message.uncertain ?? []).map((word) => word.toLowerCase()));
  return message.text.split(/(\s+)/).map((part) => {
    const clean = part.replace(/[^\p{L}\p{N}']/gu, "").toLowerCase();
    if (clean && uncertain.has(clean)) {
      return `<button class="uncertain-word" type="button" data-message="${index}" data-word="${escapeHTML(part)}" title="Tap to correct this word">${escapeHTML(part)}</button>`;
    }
    return escapeHTML(part);
  }).join("");
}

function renderTalkThread() {
  if (!els.talkThread) return;
  const hasMessages = talkMessages.length > 0;
  els.talkEmpty?.classList.toggle("hidden", hasMessages);
  const messages = talkMessages.map((message, index) => {
    const time = new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const roleLabel = message.role === "sign"
      ? "Signed"
      : message.role === "spoken"
        ? "Spoken"
        : "System";
    return `<article class="talk-message ${escapeHTML(message.role)}">
      <div class="talk-message-head">
        <span>${escapeHTML(roleLabel)} · <b class="talk-chip">${escapeHTML(message.lang ?? "")}</b></span>
        <time>${escapeHTML(time)}</time>
      </div>
      <p>${messageTextHTML(message, index)}</p>
      ${message.translation ? `<small class="talk-translation">Spoken: ${escapeHTML(message.translation)}</small>` : ""}
      ${message.label ? `<small>${escapeHTML(message.label)}</small>` : ""}
    </article>`;
  }).join("");
  const existing = [...els.talkThread.querySelectorAll(".talk-message")].map((node) => node.outerHTML).join("");
  if (messages !== existing) {
    els.talkThread.querySelectorAll(".talk-message").forEach((node) => node.remove());
    els.talkThread.insertAdjacentHTML("beforeend", messages);
  }
  els.talkThread.scrollTop = els.talkThread.scrollHeight;
}

function renderTalkSignPreview(text) {
  if (!els.talkSignPreview) return;
  const clean = String(text ?? "").trim();
  if (!clean) {
    els.talkSignPreview.innerHTML = "";
    return;
  }
  const phrase = phraseForText(clean);
  if (phrase) {
    const label = PHRASE_LABELS[phrase.id] ?? clean;
    els.talkSignPreview.innerHTML = `<div class="sign-preview-card" data-sign="${escapeHTML(phrase.id)}">
      <div class="sign-preview-icon"><svg class="icon" aria-hidden="true"><use href="#i-hand"></use></svg></div>
      <div class="sign-preview-copy">
        <span class="label">sign back</span>
        <strong>${escapeHTML(label)}</strong>
        <small>${escapeHTML(phrase.note)} · motion/facial grammar not shown</small>
      </div>
    </div>`;
    return;
  }

  const language = currentLearnLang === "BSL" ? "ASL" : currentLearnLang;
  if (/[^\p{Script=Latin}\p{N}\s'.,!?…()-]/u.test(clean)) {
    els.talkSignPreview.innerHTML = `<div class="sign-preview-card">
      <div class="sign-preview-icon"><svg class="icon" aria-hidden="true"><use href="#i-hand"></use></svg></div>
      <div class="sign-preview-copy">
        <span class="label">sign back</span>
        <strong>${escapeHTML(clean)}</strong>
        <small>This script is not covered by the Latin-based handshape library. Use a phrase card or record a sign video.</small>
      </div>
    </div>`;
    return;
  }
  const glyphs = [...clean.toUpperCase()].slice(0, 36).map((character) => {
    if (character === " ") return `<span class="glyph is-space" aria-hidden="true">·</span>`;
    const prototype = prototypeFor(language, character);
    if (!prototype) return `<span class="glyph is-unsupported"><strong>${escapeHTML(character)}</strong></span>`;
    return `<div class="glyph" title="${escapeHTML(character)}">${handSvg(prototype.landmarks, { label: `${character} handshape`, decorative: true })}<strong>${escapeHTML(character)}</strong></div>`;
  }).join("");
  els.talkSignPreview.innerHTML = `<div class="sign-preview-head"><span class="label">sign back</span><span>fingerspelling · handshape only</span></div>
    <div class="glyph-strip talk-glyphs">${glyphs || `<span class="talk-preview-hint">Nothing to sign yet.</span>`}</div>
    <p class="fine-print">Motion, location, orientation, and facial grammar are not shown. This is a visual reply aid, not a full sign-language generator.</p>`;
}

function sendSpokenText(text, { speakIt = true } = {}) {
  const clean = String(text ?? "").trim();
  if (!clean) return;
  addTalkMessage("spoken", clean);
  renderTalkSignPreview(clean);
  if (speakIt) speakText(clean);
  if (els.talkInput) els.talkInput.value = "";
}

function handleTalkTranscript(payload = {}) {
  const finalText = String(payload.finalText ?? "").trim();
  if (!finalText) {
    if (!payload.interimText) lastAsrFinal = "";
    return;
  }
  const delta = finalText.startsWith(lastAsrFinal)
    ? finalText.slice(lastAsrFinal.length).trim()
    : finalText;
  lastAsrFinal = finalText;
  if (delta) {
    addTalkMessage("spoken", delta);
    renderTalkSignPreview(delta);
  }
}

function clearTalk() {
  talkMessages = [];
  lastAsrFinal = "";
  lastTalkSignAt = 0;
  correctionTarget = null;
  renderTalkThread();
  renderTalkSignPreview("");
  updateTalkMode();
}

function openCorrection(index, word) {
  const message = talkMessages[index];
  if (!message || !els.correctionDialog || !els.correctionInput) return;
  correctionTarget = { index, word };
  els.correctionInput.value = word;
  els.correctionDialog.showModal();
  setTimeout(() => {
    els.correctionInput.focus();
    els.correctionInput.select();
  }, 0);
}

function saveCorrection() {
  if (!correctionTarget) return;
  const { index, word } = correctionTarget;
  const message = talkMessages[index];
  const replacement = String(els.correctionInput?.value ?? "").trim();
  if (!message || !replacement) return;
  message.text = message.text.split(word).join(replacement);
  message.uncertain = (message.uncertain ?? []).filter((item) => item !== word);
  correctionTarget = null;
  els.correctionDialog?.close();
  renderTalkThread();
  toast("Correction saved in this conversation.", { type: "success", duration: 2200 });
}

function initTalk() {
  if (els.talkQuick) {
    renderTalkQuickPhrases();
    els.talkQuick.addEventListener("click", (event) => {
      const button = event.target.closest("[data-talk-phrase]");
      if (!button) return;
      sendSpokenText(button.dataset.talkPhrase);
    });
  }
  els.talkForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendSpokenText(els.talkInput?.value);
  });
  els.talkThread?.addEventListener("click", (event) => {
    const button = event.target.closest(".uncertain-word");
    if (!button) return;
    openCorrection(Number(button.dataset.message), button.dataset.word);
  });
  els.correctionSave?.addEventListener("click", saveCorrection);
  els.correctionDialog?.addEventListener("click", (event) => {
    if (event.target === els.correctionDialog) els.correctionDialog.close();
  });
  els.talkClear?.addEventListener("click", () => {
    clearTalk();
    toast("Conversation cleared.", { type: "info", duration: 1600 });
  });
  els.talkListen?.addEventListener("click", () => toggleAsr({ goToVoice: false }));
  els.talkSpeak?.addEventListener("click", speakEnglish);
  els.talkAutoSpeak?.addEventListener("change", () => {
    updateSettings({ speech: els.talkAutoSpeak.checked });
    settings = getSettings();
    if (!settings.speech) stopSpeaking();
  });
  if (els.talkAutoSpeak) els.talkAutoSpeak.checked = settings.speech;
  renderTalkThread();
  renderTalkSignPreview("");
  updateTalkMode();
}

function startSessionClock() {
  sessionClockStartedAt = Date.now();
  sessionClockStoppedAt = null;
  renderStatsFromAccumulator();
}

function stopSessionClock() {
  if (sessionClockStartedAt && !sessionClockStoppedAt) sessionClockStoppedAt = Date.now();
  renderStatsFromAccumulator();
}

function sessionDuration() {
  if (!sessionClockStartedAt) return 0;
  return Math.max(0, (sessionClockStoppedAt ?? Date.now()) - sessionClockStartedAt);
}

function renderStatsFromAccumulator() {
  const state = accumulator?.getState();
  const tokens = state?.tokens?.length ?? 0;
  const words = state?.english ? state.english.split(/\s+/).filter(Boolean).length : 0;
  const elapsed = sessionDuration();
  const transcriptElapsed = sessionLog.count ? sessionLog.durationMs : elapsed;
  setText(els.statTokens, tokens);
  setText(els.statWords, words);
  setText(els.statDuration, formatDuration(elapsed));
  setText(els.sessionClock, formatDuration(elapsed));
  setText(els.transcriptCount, tokens);
  setText(els.transcriptDuration, formatDuration(transcriptElapsed));
  setText(els.transcriptLanguage, profile.shortName);
  setText(els.statusModel, profile.shortName);
}

function onAccumulatorState(state) {
  sessionLog.update(state);
  renderStatsFromAccumulator();
  renderTimeline();
  if (currentView === "transcript") renderTranscriptView();
  if (state.tokens.length > lastAnnouncedTokenCount) {
    const latest = state.tokens[state.tokens.length - 1];
    setText(els.signAnnouncer, `Signed ${latest.label ?? latest.id}`);
    addTalkMessage("sign", state.english || latest.label || latest.id, {
      label: latest.label ?? phraseLabel(latest.id) ?? latest.id,
      uncertain: state.tokens
        .filter((token) => token.confidence && token.confidence < settings.threshold)
        .map((token) => token.label ?? token.id),
      update: true,
    });
    lastAnnouncedTokenCount = state.tokens.length;
  } else if (state.tokens.length < lastAnnouncedTokenCount) {
    lastAnnouncedTokenCount = state.tokens.length;
  }
  if (settings.speech && state.tokens.length > lastSpokenTokenCount) {
    lastSpokenTokenCount = state.tokens.length;
    scheduleSpeech(state.english);
  } else if (state.tokens.length < lastSpokenTokenCount) {
    lastSpokenTokenCount = state.tokens.length;
  }
}

function buildAccumulator() {
  accumulator = new TextAccumulator({
    profile,
    wordGapMs: settings.wordGapMs,
    onGloss: (glosses) => {
      setText(els.glossStream, glosses.length ? glosses.join(" ") : "");
    },
    onEnglish: (english) => {
      setText(els.englishStream, english || "");
      updateSpokenTranslation(english || "");
    },
    onState: onAccumulatorState,
  });
}

/* ── Session actions ───────────────────────────────────────── */
function clearSession({ silent = false } = {}) {
  accumulator.clear();
  sessionLog.clear();
  debouncer.reset();
  sequenceDebouncer.reset();
  lastGestureId = null;
  lastSequenceAt = 0;
  lastMotionAt = 0;
  lastSpokenTokenCount = 0;
  lastAnnouncedTokenCount = 0;
  sessionClockStartedAt = null;
  sessionClockStoppedAt = null;
  setText(els.signAnnouncer, "Session cleared");
  resetLiveReadout();
  renderTimeline();
  renderTranscriptView();
  renderStatsFromAccumulator();
  if (!silent) toast("Cleared.", { type: "info", duration: 1600 });
}

async function copyText(text) {
  const clean = String(text ?? "").trim();
  if (!clean || clean === "—") {
    toast("Nothing to copy yet.", { type: "info" });
    return false;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(clean);
    } else {
      const area = document.createElement("textarea");
      area.value = clean;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    return true;
  } catch {
    toast("Clipboard was blocked by the browser.", { type: "error" });
    return false;
  }
}

async function copyEnglish() {
  if (await copyText(els.englishStream.textContent)) toast("English copied.", { type: "success" });
}

function exportSession(format = "txt") {
  if (!sessionLog.count) {
    toast("Nothing to export.", { type: "info" });
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = `glipter-${profile.shortName.toLowerCase().replaceAll(" ", "-")}-${stamp}`;
  if (format === "csv") {
    downloadText(`${base}.csv`, sessionLog.toCSV(), "text/csv;charset=utf-8");
  } else if (format === "json") {
    downloadText(`${base}.json`, sessionLog.toJSON(), "application/json;charset=utf-8");
  } else {
    downloadText(`${base}.txt`, sessionLog.toTXT(), "text/plain;charset=utf-8");
  }
  toast(`Exported ${format.toUpperCase()} transcript.`, { type: "success" });
}

function speakEnglish() {
  const text = els.englishStream.textContent?.trim();
  if (!text || text === "—") {
    toast("Nothing to speak yet.", { type: "info" });
    return;
  }
  if (!canSpeak()) {
    toast("Speech not available.", { type: "error" });
    return;
  }
  speak(translateForSpeech(text, settings.ttsLang), {
    enabled: true,
    engine: settings.ttsEngine,
    lang: settings.ttsLang,
    voiceURI: settings.voiceURI,
    rate: settings.ttsRate,
    force: true,
  });
}

/* ── Settings UI ───────────────────────────────────────────── */
function syncSettingsUI() {
  settings = getSettings();
  if (els.settingTheme) els.settingTheme.value = settings.theme;
  if (els.settingTextSize) els.settingTextSize.value = settings.textSize;
  if (els.settingContrast) els.settingContrast.checked = settings.highContrast;
  if (els.settingMotion) els.settingMotion.checked = settings.reduceMotion;
  if (els.settingMirror) els.settingMirror.checked = settings.mirror;
  if (els.settingSkeleton) els.settingSkeleton.checked = settings.skeleton;
  if (els.settingComplexity) els.settingComplexity.value = String(settings.complexity);
  if (els.settingInference) els.settingInference.value = settings.inference;
  if (els.settingThreshold) els.settingThreshold.value = String(settings.threshold);
  if (els.settingThresholdValue) els.settingThresholdValue.value = settings.threshold.toFixed(2);
  if (els.settingMargin) els.settingMargin.value = String(settings.minMargin);
  if (els.settingMarginValue) els.settingMarginValue.value = settings.minMargin.toFixed(2);
  if (els.settingWordGap) els.settingWordGap.value = String(settings.wordGapMs);
  if (els.settingWordGapValue) els.settingWordGapValue.value = `${(settings.wordGapMs / 1000).toFixed(1)}s`;
  if (els.settingSpeech) els.settingSpeech.checked = settings.speech;
  if (els.talkAutoSpeak) els.talkAutoSpeak.checked = settings.speech;
  if (els.settingTtsEngine) els.settingTtsEngine.value = settings.ttsEngine;
  if (els.ttsEngine) els.ttsEngine.value = settings.ttsEngine;
  if (els.settingTtsLang) els.settingTtsLang.value = settings.ttsLang;
  if (els.ttsLang) els.ttsLang.value = settings.ttsLang;
  if (els.settingHaptics) els.settingHaptics.checked = settings.haptics;
  if (els.settingLowPower) els.settingLowPower.checked = settings.lowPower;
  if (els.settingRate) els.settingRate.value = String(settings.ttsRate);
  if (els.settingRateValue) els.settingRateValue.value = settings.ttsRate.toFixed(2);
  if (els.ttsRate) els.ttsRate.value = String(settings.ttsRate);
  if (els.ttsRateValue) els.ttsRateValue.value = settings.ttsRate.toFixed(2);
  if (els.asrLang) els.asrLang.value = settings.asrLang;
  if (els.mirrorToggle) els.mirrorToggle.checked = settings.mirror;
  if (els.skeletonToggle) els.skeletonToggle.checked = settings.skeleton;
  els.cameraStage?.classList.toggle("mirror", settings.mirror);
  if (accumulator) accumulator.wordGapMs = settings.wordGapMs;
  engine?.setOptions({
    complexity: settings.lowPower ? 0 : settings.complexity,
    maxHands: settings.lowPower ? 1 : 2,
    minFrameInterval: settings.lowPower ? 66 : 0,
    inference: settings.inference,
    maxCaptureSize: settings.lowPower ? 480 : (window.matchMedia?.("(pointer: coarse)").matches ? 640 : 960),
  });
  populateVoices();
}

function openSettings() {
  syncSettingsUI();
  els.settingsDialog.showModal();
}

function bindSettings() {
  const save = (patch) => {
    updateSettings(patch);
    syncSettingsUI();
  };

  els.settingTheme?.addEventListener("change", () => save({ theme: els.settingTheme.value }));
  els.settingTextSize?.addEventListener("change", () => save({ textSize: els.settingTextSize.value }));
  els.settingContrast?.addEventListener("change", () => save({ highContrast: els.settingContrast.checked }));
  els.settingMotion?.addEventListener("change", () => save({ reduceMotion: els.settingMotion.checked }));
  els.settingMirror?.addEventListener("change", () => save({ mirror: els.settingMirror.checked }));
  els.settingSkeleton?.addEventListener("change", () => save({ skeleton: els.settingSkeleton.checked }));
  els.settingComplexity?.addEventListener("change", () => save({ complexity: Number(els.settingComplexity.value) }));
  els.settingInference?.addEventListener("change", () => {
    save({ inference: els.settingInference.value });
    toast(
      els.settingInference.value === "cpu"
        ? "CPU/WASM inference selected. Restart the camera to apply."
        : els.settingInference.value === "gpu"
          ? "GPU inference selected. Restart the camera to apply."
          : "Auto inference selected: GPU if available, CPU fallback.",
      { type: "info", duration: 3200 },
    );
  });
  els.settingThreshold?.addEventListener("input", () => save({ threshold: Number(els.settingThreshold.value) }));
  els.settingMargin?.addEventListener("input", () => save({ minMargin: Number(els.settingMargin.value) }));
  els.settingWordGap?.addEventListener("input", () => save({ wordGapMs: Number(els.settingWordGap.value) }));
  els.settingSpeech?.addEventListener("change", () => {
    save({ speech: els.settingSpeech.checked });
    if (!els.settingSpeech.checked) stopSpeaking();
  });
  els.settingTtsEngine?.addEventListener("change", () => {
    save({ ttsEngine: els.settingTtsEngine.value });
    toast(
      els.settingTtsEngine.value === "espeak"
        ? "Embedded multilingual voice selected. eSpeak NG runs inside Glipter, offline."
        : "System voice selected. The browser/OS must provide a speech voice.",
      { type: "info", duration: 3600 },
    );
  });
  els.settingTtsLang?.addEventListener("change", () => applySpokenLanguage(els.settingTtsLang.value));
  els.settingHaptics?.addEventListener("change", () => save({ haptics: els.settingHaptics.checked }));
  els.settingLowPower?.addEventListener("change", () => {
    save({ lowPower: els.settingLowPower.checked });
    toast(els.settingLowPower.checked ? "Low-power mode on: one hand, lite model, ~15 fps." : "Low-power mode off.", { type: "info", duration: 2400 });
  });
  els.settingKiosk?.addEventListener("click", () => {
    els.settingsDialog.close();
    enterKiosk();
  });
  els.settingOnboarding?.addEventListener("click", () => {
    els.settingsDialog.close();
    openOnboarding(true);
  });
  els.settingVoiceView?.addEventListener("click", () => {
    els.settingsDialog.close();
    showView("voice");
  });
  els.settingAboutView?.addEventListener("click", () => {
    els.settingsDialog.close();
    showView("about");
  });
  els.settingVoice?.addEventListener("change", () => {
    save({ voiceURI: els.settingVoice.value });
    if (els.ttsVoice) els.ttsVoice.value = els.settingVoice.value;
  });
  els.settingRate?.addEventListener("input", () => save({ ttsRate: Number(els.settingRate.value) }));

  els.mirrorToggle?.addEventListener("change", () => save({ mirror: els.mirrorToggle.checked }));
  els.skeletonToggle?.addEventListener("change", () => save({ skeleton: els.skeletonToggle.checked }));

  els.settingsReset?.addEventListener("click", () => {
    resetSettings();
    syncSettingsUI();
    toast("Settings reset to defaults.", { type: "info" });
  });

  els.settingsBtn?.addEventListener("click", openSettings);
  els.railSettings?.addEventListener("click", openSettings);
  els.settingsDialog?.addEventListener("click", (event) => {
    if (event.target === els.settingsDialog) els.settingsDialog.close();
  });
}

/* ── PWA ───────────────────────────────────────────────────── */
function updateOfflineBadge(status) {
  if (!els.offlineBadge) return;
  const use = els.offlineBadge.querySelector("use");
  els.offlineBadge.classList.remove("pill-success");
  let label = "Online";
  let icon = "#i-wifi";
  let statusText = "caching…";
  if (!status.online) {
    label = "Offline";
    icon = "#i-offline";
    statusText = "offline";
  } else if (status.offlineReady) {
    label = "Offline ready";
    icon = "#i-check";
    statusText = "ready";
    els.offlineBadge.classList.add("pill-success");
  } else if (status.progress?.total && status.progress.done >= status.progress.total && status.progress.failed > 0) {
    label = "Offline partial";
    icon = "#i-alert";
    statusText = "partial";
  } else if (status.progress?.total) {
    label = `Caching ${status.progress.done}/${status.progress.total}`;
    statusText = label.toLowerCase();
  }
  setText(els.offlineText, label);
  use?.setAttribute("href", icon);
  els.offlineBadge.title = status.offlineReady
    ? "This app is cached and can run without a network after first load."
    : "Connect once to finish caching the app for offline use.";
  setText(els.statusOffline, statusText);
}

async function installApp() {
  if (!pwa?.canInstall) {
    toast("Use your browser's Install or Add to Home Screen action.", { type: "info", duration: 4200 });
    return;
  }
  const accepted = await pwa.install();
  if (accepted) toast("Glipter installed. It will open offline.", { type: "success" });
}

function initOffline() {
  pwa = initPWA({
    onStatus: updateOfflineBadge,
    onInstallAvailable: (available) => {
      installAvailable = available;
      els.installBtn?.classList.toggle("hidden", !available);
    },
  });

  els.installBtn?.addEventListener("click", installApp);

  if (location.protocol === "file:") {
    updateOfflineBadge({ online: navigator.onLine, offlineReady: false });
    toast("Opening from a file works for the UI, but the camera needs localhost or HTTPS.", { type: "info", duration: 6000 });
  }
}

/* ── Model cards ───────────────────────────────────────────── */
function renderModelCards() {
  if (!els.modelCards) return;
  const cards = [];
  for (const language of LANGUAGES) {
    const model = language.model;
    if (!model) {
      const review = language.review ?? { status: "pending", version: "0.1.0" };
      cards.push(`<div class="model-card">
        <div class="model-card-head"><strong>${escapeHTML(language.name)}</strong><span>${escapeHTML(review.status)} · v${escapeHTML(review.version)}</span></div>
        <div class="model-metric"><span>mode</span><b>${escapeHTML(language.mode)} · rules</b></div>
        <div class="model-metric"><span>benchmark</span><b>none bundled</b></div>
        <div class="model-metric"><span>review</span><b>${escapeHTML(review.status)} · ${review.reviewers?.length ?? 0} reviewers</b></div>
      </div>`);
      continue;
    }
    const metrics = model.metrics ?? {};
    const perClass = model.perClass ?? {};
    const review = language.review ?? { status: "pending", version: "0.1.0" };
    const weakest = Object.entries(perClass).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const confusions = (model.confusions ?? []).slice(0, 3);
    cards.push(`<div class="model-card">
      <div class="model-card-head"><strong>${escapeHTML(language.shortName)} · ${escapeHTML(model.id)}</strong><span>${escapeHTML(review.status)} · v${escapeHTML(review.version)}</span></div>
      <div class="model-metric"><span>top-1 / top-3</span><b>${metrics.top1 ? pct(metrics.top1) : "—"} / ${metrics.top3 ? pct(metrics.top3) : "—"}</b></div>
      <div class="model-metric"><span>test samples</span><b>${metrics.testSamples ?? "—"}</b></div>
      <div class="model-metric"><span>split</span><b>${escapeHTML(metrics.split ?? "—")}</b></div>
      <div class="model-metric"><span>weakest</span><b>${weakest.map(([key, value]) => `${key} ${pct(value, 0)}`).join(" · ") || "—"}</b></div>
      <div class="model-metric"><span>confusions</span><b>${confusions.map((item) => `${item.expected}→${item.actual}`).join(" · ") || "—"}</b></div>
      <div class="model-metric"><span>review</span><b>${escapeHTML(review.status)} · ${review.reviewers?.length ?? 0} reviewers</b></div>
    </div>`);
  }
  els.modelCards.innerHTML = cards.join("");
}

/* ── Voice / ASR / TTS ─────────────────────────────────────── */
function setAsrButton(listening) {
  if (!els.asrToggle) return;
  els.asrToggle.innerHTML = listening
    ? `<svg class="icon" aria-hidden="true"><use href="#i-stop"></use></svg> Stop`
    : `<svg class="icon" aria-hidden="true"><use href="#i-mic"></use></svg> Listen`;
  els.asrWave?.classList.toggle("is-listening", listening);
  if (els.talkListen) {
    els.talkListen.innerHTML = listening
      ? `<svg class="icon" aria-hidden="true"><use href="#i-stop"></use></svg> Stop listening`
      : `<svg class="icon" aria-hidden="true"><use href="#i-mic"></use></svg> Speak reply`;
    els.talkListen.classList.toggle("is-listening", listening);
  }
  updateTalkMode();
}

function renderAsrTranscript({ finalText = "", interimText = "" } = {}) {
  const text = [finalText, interimText].filter(Boolean).join(" ").trim();
  if (!text) {
    els.asrTranscript.textContent = "";
  } else {
    els.asrTranscript.innerHTML = `${escapeHTML(finalText)}${interimText ? ` <span class="interim">${escapeHTML(interimText)}</span>` : ""}`;
  }
  const hasText = Boolean(text);
  if (els.asrToSpeak) els.asrToSpeak.disabled = !hasText;
  if (els.asrCopy) els.asrCopy.disabled = !hasText;
  if (els.asrSpeak) els.asrSpeak.disabled = !hasText;
}

function setAsrStatus(status, detail = "") {
  if (!els.asrStatus) return;
  els.asrStatus.className = "voice-status";
  if (status === "listening") {
    els.asrStatus.textContent = "Listening…";
    els.asrStatus.classList.add("is-listening");
    setAsrButton(true);
  } else if (status === "starting") {
    els.asrStatus.textContent = "Starting microphone…";
    setAsrButton(true);
  } else if (status === "silent") {
    els.asrStatus.textContent = "No speech detected. Still listening…";
    setAsrButton(true);
  } else if (status === "error") {
    els.asrStatus.textContent = `Recognition error${detail ? `: ${detail}` : ""}`;
    els.asrStatus.classList.add("is-error");
    setAsrButton(false);
  } else if (status === "unsupported") {
    els.asrStatus.textContent = "Speech recognition is unavailable in this browser.";
    els.asrStatus.classList.add("is-error");
    setAsrButton(false);
  } else {
    els.asrStatus.textContent = "Idle";
    setAsrButton(false);
  }
  updateTalkMode();
}

function toggleAsr({ goToVoice = true } = {}) {
  if (goToVoice) showView("voice");
  if (!SpeechInput.supported) {
    toast("Speech recognition is not supported here. Use the phrase board or type instead.", { type: "error" });
    return;
  }
  if (asr?.listening) {
    asr.stop();
    setAsrStatus("idle");
    return;
  }
  if (!navigator.onLine && !SpeechInput.localRecognitionSupported) {
    toast("You are offline and this browser has no local ASR. Use a quick phrase or type instead.", { type: "info", duration: 4200 });
  }
  asr?.start();
}

function populateVoices() {
  const embedded = usesEmbeddedTts();
  const system = canUseSystemTts();
  const voices = system ? getVoices() : [];

  if (!embedded && !system) {
    if (els.ttsSupport) {
      els.ttsSupport.textContent = "TTS unavailable";
      els.ttsSupport.classList.add("error");
    }
    if (els.ttsVoice) els.ttsVoice.innerHTML = `<option value="">No voices available</option>`;
    if (els.settingVoice) els.settingVoice.innerHTML = `<option value="">No voices available</option>`;
    if (els.ttsNote) els.ttsNote.textContent = "This browser cannot play embedded or system speech.";
    return;
  }

  const options = voices.length
    ? voices.map((voice) => `<option value="${escapeHTML(voice.voiceURI)}">${escapeHTML(voice.name)} · ${voice.localService ? "local" : "remote"} · ${escapeHTML(voice.lang)}</option>`).join("")
    : `<option value="">Embedded voice · no system voice needed</option>`;

  const preferred = preferredVoice(settings.voiceURI);
  const selected = settings.voiceURI || preferred?.voiceURI || "";
  if (system && selected && selected !== settings.voiceURI) {
    settings = updateSettings({ voiceURI: selected });
  }

  for (const select of [els.ttsVoice, els.settingVoice]) {
    if (!select) continue;
    select.innerHTML = options;
    if (selected) select.value = selected;
    select.disabled = settings.ttsEngine !== "system";
  }
  els.settingVoice?.closest(".setting-row")?.classList.toggle("hidden", settings.ttsEngine !== "system");
  els.ttsVoice?.closest(".voice-field")?.classList.toggle("hidden", settings.ttsEngine !== "system");
  if (els.ttsEngine) els.ttsEngine.value = settings.ttsEngine;
  if (els.settingTtsEngine) els.settingTtsEngine.value = settings.ttsEngine;

  fillSpokenLanguageSelect();
  for (const select of [els.ttsLang, els.settingTtsLang]) {
    if (select) select.disabled = settings.ttsEngine !== "espeak";
  }

  if (els.ttsSupport) {
    els.ttsSupport.textContent = embedded
      ? "TTS · embedded · EN + African languages"
      : voices.length
        ? `TTS · ${voices.length} system voices`
        : "TTS unavailable";
    els.ttsSupport.classList.toggle("pill-success", embedded || voices.length > 0);
    els.ttsSupport.classList.toggle("error", !embedded && !voices.length);
  }
  if (els.ttsNote) {
    const local = localVoiceCount();
    if (settings.ttsEngine === "espeak") {
      els.ttsNote.textContent = `Embedded eSpeak NG voice: ${ttsLanguageLabel(settings.ttsLang)}. English, Kiswahili, Afrikaans, Amharic, Setswana, Oromo, and Tigrinya run offline. eSpeak NG is GPL-3.0; no OS voice is required.`;
    } else if (voices.length) {
      els.ttsNote.textContent = `${voices.length} system voice${voices.length === 1 ? "" : "s"} available (${local} local). System voices depend on the browser/OS.`;
    } else {
      els.ttsNote.textContent = "No system voice found. Switch to the embedded engine.";
    }
  }
  if (els.settingRateValue) els.settingRateValue.value = settings.ttsRate.toFixed(2);
  if (els.ttsRateValue) els.ttsRateValue.value = settings.ttsRate.toFixed(2);
  if (els.ttsRate) els.ttsRate.value = String(settings.ttsRate);
  if (els.settingRate) els.settingRate.value = String(settings.ttsRate);
  updateVoiceNetworkState();
}

function speakText(text, { force = true } = {}) {
  if (!canSpeak()) {
    toast("Speech synthesis is unavailable in this browser.", { type: "error" });
    return;
  }
  const ok = speak(translateForSpeech(text, settings.ttsLang), {
    enabled: true,
    engine: settings.ttsEngine,
    lang: settings.ttsLang,
    voiceURI: settings.voiceURI,
    rate: settings.ttsRate,
    force,
  });
  if (!ok) toast("Nothing to speak.", { type: "info" });
}

function updateVoiceNetworkState() {
  if (!els.asrNetwork) return;
  els.asrNetwork.classList.remove("warn", "error");
  if (!SpeechInput.supported) {
    setText(els.asrNetwork, "ASR unavailable · phrase board offline");
    els.asrNetwork.classList.add("error");
  } else if (SpeechInput.localRecognitionSupported) {
    setText(els.asrNetwork, "ASR · on-device capable");
    els.asrNetwork.classList.add("pill-success");
  } else if (!navigator.onLine) {
    setText(els.asrNetwork, "Offline · phrase board / type");
    els.asrNetwork.classList.add("warn");
  } else {
    setText(els.asrNetwork, "browser ASR · may need network");
  }
  updateTalkMode();
}

function initVoice() {
  if (els.asrSupport) {
    els.asrSupport.textContent = SpeechInput.supported ? "ASR ready" : "ASR unavailable";
    els.asrSupport.classList.toggle("error", !SpeechInput.supported);
    els.asrSupport.classList.toggle("pill-success", SpeechInput.supported);
    if (SpeechInput.localRecognitionSupported) els.asrSupport.textContent = "ASR · local capable";
  }
  if (els.asrNote) {
    els.asrNote.textContent = SpeechInput.supported
      ? "Glipter never uploads audio itself. Some browsers use an online recogniser; newer ones expose on-device recognition. Offline, use a quick phrase or the text box; the embedded TTS still works."
      : "Speech recognition is not available in this browser. Use the phrase board or text box; the embedded TTS still works.";
  }

  asr = new SpeechInput({
    lang: settings.asrLang,
    preferLocal: true,
    onTranscript: (payload) => {
      renderAsrTranscript(payload);
      handleTalkTranscript(payload);
    },
    onStatus: setAsrStatus,
    onMode: () => {
      updateVoiceNetworkState();
      updateTalkMode();
    },
    onError: (code) => {
      if (code === "not-allowed" || code === "service-not-allowed") {
        toast("Microphone permission was blocked. Allow it in the browser, then try again.", { type: "error", duration: 5000 });
      } else if (code === "audio-capture") {
        toast("No microphone was found.", { type: "error" });
      } else if (code === "language-not-supported") {
        toast("That ASR language is not supported. Try English (US).", { type: "error" });
      }
    },
  });

  if (els.asrLang) {
    fillAsrLanguages();
    els.asrLang.addEventListener("change", () => {
      updateSettings({ asrLang: els.asrLang.value });
      settings = getSettings();
      asr.setLang(els.asrLang.value);
      toast(`Speech input language updated.`, { type: "info", duration: 2200 });
    });
  }
  els.asrToggle?.addEventListener("click", toggleAsr);
  els.asrUseText?.addEventListener("click", () => {
    showView("voice");
    els.ttsText?.focus();
    toast("Type in the Speak panel; TTS still works offline with a local voice.", { type: "info", duration: 3600 });
  });
  els.asrClear?.addEventListener("click", () => {
    asr.clear();
    renderAsrTranscript();
    lastAsrFinal = "";
    toast("Speech text cleared.", { type: "info", duration: 1600 });
  });
  els.asrToSpeak?.addEventListener("click", () => {
    const text = [asr.finalText, asr.interimText].filter(Boolean).join(" ").trim();
    if (!text) return;
    els.ttsText.value = text;
    showView("voice");
    toast("Sent to the Speak panel.", { type: "success", duration: 1800 });
  });
  els.asrCopy?.addEventListener("click", async () => {
    const text = [asr.finalText, asr.interimText].filter(Boolean).join(" ").trim();
    if (await copyText(text)) toast("Speech text copied.", { type: "success" });
  });
  els.asrSpeak?.addEventListener("click", () => {
    const text = [asr.finalText, asr.interimText].filter(Boolean).join(" ").trim();
    speakText(text);
  });

  els.ttsSpeak?.addEventListener("click", () => speakText(els.ttsText.value));
  els.ttsStop?.addEventListener("click", () => {
    stopSpeaking();
    toast("Speech stopped.", { type: "info", duration: 1200 });
  });
  els.ttsCopy?.addEventListener("click", async () => {
    if (await copyText(els.ttsText.value)) toast("Text copied.", { type: "success" });
  });
  els.ttsRate?.addEventListener("input", () => {
    updateSettings({ ttsRate: Number(els.ttsRate.value) });
    syncSettingsUI();
  });
  els.ttsVoice?.addEventListener("change", () => {
    updateSettings({ voiceURI: els.ttsVoice.value });
    syncSettingsUI();
  });
  els.ttsEngine?.addEventListener("change", () => {
    updateSettings({ ttsEngine: els.ttsEngine.value });
    syncSettingsUI();
    toast(
      els.ttsEngine.value === "espeak"
        ? "Embedded multilingual voice active: eSpeak NG, offline."
        : "System voice active. Requires an installed browser/OS voice.",
      { type: "info", duration: 3000 },
    );
  });
  els.ttsLang?.addEventListener("change", () => applySpokenLanguage(els.ttsLang.value));
  els.settingVoice?.addEventListener("change", () => {
    updateSettings({ voiceURI: els.settingVoice.value });
    syncSettingsUI();
  });

  if (els.quickPhrases) {
    renderVoiceQuickPhrases();
    els.quickPhrases.addEventListener("click", (event) => {
      const button = event.target.closest("[data-phrase]");
      if (!button) return;
      els.ttsText.value = button.dataset.phrase;
      speakText(button.dataset.phrase);
    });
  }

  els.speakBtn?.addEventListener("click", speakEnglish);
  onVoicesChanged(populateVoices);
  populateVoices();
  renderAsrTranscript();
  setAsrStatus(SpeechInput.supported ? "idle" : "unsupported");
  updateVoiceNetworkState();
  refreshVoices();
}

/* ── Command palette ───────────────────────────────────────── */
function getCommands() {
  return [
    { id: "start", label: "Start camera", hint: "S", icon: "i-camera", run: startCamera },
    { id: "kiosk", label: "Enter kiosk mode", icon: "i-grid", run: enterKiosk },
    { id: "stop", label: "Stop engine", hint: "S", icon: "i-stop", run: () => stopEverything() },
    { id: "demo", label: "Play landmark demo", hint: "D", icon: "i-play", run: startDemo },
    { id: "asr", label: "Start / stop speech input", hint: "M", icon: "i-mic", run: toggleAsr },
    { id: "speak", label: "Speak current English", hint: "T", icon: "i-volume", run: speakEnglish },
    { id: "clear", label: "Clear session", hint: "C", icon: "i-trash", run: clearSession },
    { id: "export", label: "Export transcript as TXT", hint: "E", icon: "i-download", run: () => exportSession("txt") },
    { id: "settings", label: "Open settings", icon: "i-settings", run: openSettings },
    { id: "view-live", label: "Go to Talk", hint: "1", icon: "i-camera", run: () => showView("live") },
    { id: "view-transcript", label: "Go to History", hint: "2", icon: "i-transcript", run: () => showView("transcript") },
    { id: "view-learn", label: "Go to Learn", hint: "3", icon: "i-book", run: () => showView("learn") },
    { id: "view-voice", label: "Go to Voice", hint: "4", icon: "i-mic", run: () => showView("voice") },
    { id: "view-about", label: "Go to About", hint: "5", icon: "i-info", run: () => showView("about") },
    { id: "lang-KSL", label: "Switch to Kenyan Sign Language", icon: "i-globe", run: () => applyLanguage(getById("KSL")) },
    { id: "lang-KSL-WORDS", label: "Switch to KSL word signs", icon: "i-globe", run: () => applyLanguage(getById("KSL-WORDS")) },
    { id: "lang-ASL", label: "Switch to American Sign Language", icon: "i-globe", run: () => applyLanguage(getById("ASL")) },
    { id: "lang-BSL", label: "Switch to British Sign Language", icon: "i-globe", run: () => applyLanguage(getById("BSL")) },
    { id: "mirror", label: "Toggle mirror preview", icon: "i-camera", run: () => { updateSettings({ mirror: !settings.mirror }); syncSettingsUI(); } },
    { id: "skeleton", label: "Toggle hand skeleton", icon: "i-hand", run: () => { updateSettings({ skeleton: !settings.skeleton }); syncSettingsUI(); } },
    { id: "install", label: "Install Glipter", icon: "i-install", run: installApp },
  ];
}

function renderCommands(query = "") {
  const q = query.trim().toLowerCase();
  commandItems = getCommands().filter((command) =>
    !q || command.label.toLowerCase().includes(q) || command.hint?.toLowerCase().includes(q) || command.id.includes(q));
  commandIndex = Math.max(0, Math.min(commandIndex, commandItems.length - 1));
  if (!commandItems.length) {
    els.commandList.innerHTML = `<div class="command-empty">No matching commands.</div>`;
    return;
  }
  els.commandList.innerHTML = commandItems.map((command, index) =>
    `<button id="command-${escapeHTML(command.id)}" class="command-item ${index === commandIndex ? "is-active" : ""}" type="button" role="option" aria-selected="${index === commandIndex}" data-command="${escapeHTML(command.id)}">
      <svg class="icon" aria-hidden="true"><use href="#${command.icon}"></use></svg>
      <span class="cmd-label">${escapeHTML(command.label)}</span>
      ${command.hint ? `<span class="cmd-key">${escapeHTML(command.hint)}</span>` : ""}
    </button>`).join("");
  $$(".command-item", els.commandList).forEach((element) => {
    element.addEventListener("click", () => runCommand(element.dataset.command));
  });
  const active = commandItems[commandIndex];
  if (active) els.commandInput?.setAttribute("aria-activedescendant", `command-${active.id}`);
  else els.commandInput?.removeAttribute("aria-activedescendant");
}

function runCommand(id) {
  const command = getCommands().find((item) => item.id === id);
  els.commandDialog.close();
  command?.run?.();
}

function openCommandPalette() {
  commandIndex = 0;
  els.commandInput.value = "";
  renderCommands();
  els.commandDialog.showModal();
  setTimeout(() => els.commandInput.focus(), 0);
}

function initCommandPalette() {
  els.commandBtn?.addEventListener("click", openCommandPalette);
  els.commandInput?.addEventListener("input", () => {
    commandIndex = 0;
    renderCommands(els.commandInput.value);
  });
  els.commandInput?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      commandIndex = Math.min(commandItems.length - 1, commandIndex + 1);
      renderCommands(els.commandInput.value);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      commandIndex = Math.max(0, commandIndex - 1);
      renderCommands(els.commandInput.value);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = commandItems[commandIndex];
      if (command) runCommand(command.id);
    } else if (event.key === "Escape") {
      els.commandDialog.close();
    }
  });
  els.commandDialog?.addEventListener("click", (event) => {
    if (event.target === els.commandDialog) els.commandDialog.close();
  });
}

/* ── Self-test ─────────────────────────────────────────────── */
function updateSelfTestStatus() {
  if (!selfTestResult) return;
  const allPass = selfTestResult.passed === selfTestResult.total;
  setText(els.statusSelfTest, `self-test ${allPass ? "✓" : "⚠"} ${selfTestResult.passed}/${selfTestResult.total}`);
  els.statusSelfTest?.classList.toggle("pass", allPass);
  els.statusSelfTest?.classList.toggle("fail", !allPass);
}

function runAndRenderSelfTest() {
  selfTestResult = runSelfTest();
  renderSelfTest(els.selfTestBadge, els.selfTestTitle, els.selfTestDetails, selfTestResult);
  updateSelfTestStatus();
  const openSelfTest = (event) => {
    event.preventDefault();
    showView("about");
    els.selfTestDetails?.classList.remove("hidden");
    els.selfTestDetails?.scrollIntoView({ block: "nearest", behavior: settings.reduceMotion ? "auto" : "smooth" });
  };
  els.selfTestBadge?.addEventListener("click", openSelfTest);
  els.statusSelfTest?.addEventListener("click", openSelfTest);
}

/* ── Keyboard shortcuts ───────────────────────────────────── */
function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && target.closest("input, select, textarea, [contenteditable='true']");
    const commandOpen = els.commandDialog?.open;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!commandOpen) openCommandPalette();
      return;
    }
    if (commandOpen || typing || els.settingsDialog?.open || els.languageDialog?.open) return;

    if (event.key === "Escape" && !els.cameraMenu?.classList.contains("hidden")) {
      event.preventDefault();
      closeCameraMenu();
      return;
    }
    if (event.key === "Escape" && !els.detailsDrawer?.classList.contains("is-closed")) {
      event.preventDefault();
      closeDetails();
      return;
    }
    if (event.key === "Escape" && kioskMode) {
      event.preventDefault();
      exitKiosk();
      return;
    }
    if (event.key === "1") { event.preventDefault(); showView("live"); }
    else if (event.key === "2") { event.preventDefault(); showView("transcript"); }
    else if (event.key === "3") { event.preventDefault(); showView("learn"); }
    else if (event.key === "4") { event.preventDefault(); showView("voice"); }
    else if (event.key === "5") { event.preventDefault(); showView("about"); }
    else if (event.key === "s" || event.key === "S") { event.preventDefault(); engine || demo ? stopEverything() : startCamera(); }
    else if (event.key === "d" || event.key === "D") { event.preventDefault(); startDemo(); }
    else if (event.key === "c" || event.key === "C") { event.preventDefault(); clearSession(); }
    else if (event.key === "e" || event.key === "E") { event.preventDefault(); exportSession("txt"); }
    else if (event.key === "t" || event.key === "T") { event.preventDefault(); speakEnglish(); }
    else if (event.key === "v" || event.key === "V") { event.preventDefault(); showView("voice"); }
    else if (event.key === "m" || event.key === "M") { event.preventDefault(); toggleAsr(); }
    else if (event.key === "?") { event.preventDefault(); toast("Shortcuts: 1 Talk · 2 History · 3 Learn · 4 Voice · 5 About · S start/stop · M mic · T speak · C clear · E export · ⌘K commands", { type: "info", duration: 5200 }); }
  });
}

/* ── Event binding ─────────────────────────────────────────── */
function bindEvents() {
  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  $$("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewJump));
  });

  els.languageSelect?.addEventListener("change", () => {
    // Applied by the language dialog's primary action, not on every change.
  });

  els.startBtn?.addEventListener("click", startCamera);
  els.heroStart?.addEventListener("click", startCamera);
  els.errorRetry?.addEventListener("click", () => {
    clearError();
    startCamera();
  });
  els.errorDismiss?.addEventListener("click", clearError);
  els.cameraMore?.addEventListener("click", toggleCameraMenu);
  els.cameraSettings?.addEventListener("click", () => {
    closeCameraMenu();
    openSettings();
  });
  els.cameraFacing?.addEventListener("click", () => {
    closeCameraMenu();
    toggleFaceToFace();
  });
  els.cameraKiosk?.addEventListener("click", () => {
    closeCameraMenu();
    enterKiosk();
  });
  els.detailsBtn?.addEventListener("click", () => {
    if (els.detailsDrawer?.classList.contains("is-closed")) openDetails();
    else closeDetails();
  });
  els.detailsClose?.addEventListener("click", closeDetails);
  els.detailsBackdrop?.addEventListener("click", closeDetails);
  els.presentBtn?.addEventListener("click", togglePresent);
  els.threadExpand?.addEventListener("click", cycleThreadSheet);
  document.addEventListener("click", (event) => {
    if (event.target.closest("#camera-menu, #camera-more")) return;
    closeCameraMenu();
  });
  els.kioskExit?.addEventListener("click", exitKiosk);
  els.stopBtn?.addEventListener("click", () => stopEverything());
  els.demoBtn?.addEventListener("click", startDemo);

  els.inspectorToggle?.addEventListener("click", () => {
    const open = els.inspectorDetails.classList.toggle("hidden") === false;
    els.inspectorToggle.setAttribute("aria-expanded", String(open));
    setText(els.inspectorToggleLabel, open ? "Hide details" : "Details");
    els.inspectorToggle.classList.toggle("is-open", open);
  });

  els.copyBtn?.addEventListener("click", copyEnglish);
  els.clearBtn?.addEventListener("click", clearSession);
  els.clearTimeline?.addEventListener("click", clearSession);
  els.undoBtn?.addEventListener("click", () => {
    accumulator.undo();
    renderStatsFromAccumulator();
    renderTimeline();
  });
  els.exportBtn?.addEventListener("click", () => exportSession("txt"));

  $("export-txt")?.addEventListener("click", () => exportSession("txt"));
  $("export-csv")?.addEventListener("click", () => exportSession("csv"));
  $("export-json")?.addEventListener("click", () => exportSession("json"));
  $("clear-session")?.addEventListener("click", clearSession);
  els.transcriptSearch?.addEventListener("input", () => {
    transcriptQuery = els.transcriptSearch.value;
    renderTranscriptView();
  });
  els.transcriptConfidence?.addEventListener("change", () => {
    transcriptMinConfidence = Number(els.transcriptConfidence.value);
    renderTranscriptView();
  });

  els.learnFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-learn-lang]");
    if (!button) return;
    currentLearnLang = button.dataset.learnLang;
    syncLearnFilter();
    renderLearnGrid(els.learnGrid, currentLearnLang);
    selectLearn(currentLearnLetter, currentLearnLang, { render: false });
  });

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-letter]");
    if (!card) return;
    openLearnForLetter(card.dataset.letter, card.dataset.language);
  });

  els.learnPractice?.addEventListener("click", () => startPractice(currentLearnLetter));
  els.practiceHeroStart?.addEventListener("click", () => startPractice(currentLearnLetter));
  els.practiceExit?.addEventListener("click", () => stopPractice());
  els.typeToSignInput?.addEventListener("input", renderTypeToSign);

  window.addEventListener("hashchange", () => {
    const name = location.hash.replace("#", "");
    if (VIEWS.includes(name) && name !== currentView) showView(name, { scroll: false });
  });

  window.addEventListener("resize", () => {
    fillLanguageSelect();
    els.languageSelect.value = profile.id;
    els.languageSelect.title = profile.name;
  });

  window.addEventListener("online", () => {
    toast("Back online. Glipter still runs locally.", { type: "success" });
    populateVoices();
    updateVoiceNetworkState();
    updateTalkMode();
  });
  window.addEventListener("offline", () => {
    toast("Offline. Models, recognition, phrase board, and local TTS still work.", { type: "info" });
    populateVoices();
    updateVoiceNetworkState();
    updateTalkMode();
  });

  window.addEventListener("beforeunload", () => {
    engine?.stop();
    demo?.stop();
    asr?.abort();
    stopSpeaking();
    accumulator?.destroy();
  });
}

/* ── Duration ticker ───────────────────────────────────────── */
function startTicker() {
  setInterval(() => {
    if (!accumulator) return;
    const elapsed = sessionDuration();
    const transcriptElapsed = sessionLog.count ? sessionLog.durationMs : elapsed;
    setText(els.statDuration, formatDuration(elapsed));
    setText(els.sessionClock, formatDuration(elapsed));
    setText(els.transcriptDuration, formatDuration(transcriptElapsed));
  }, 1000);
}

/* ── Onboarding ───────────────────────────────────────────── */
const ONBOARDING_KEY = "glipter.onboarding.v1";

function setOnboardingStep(step) {
  onboardingStep = Math.max(0, Math.min(2, step));
  els.onboardingSteps.forEach((element, index) => {
    const active = index === onboardingStep;
    element.classList.toggle("is-active", active);
    element.hidden = !active;
  });
  els.onboardingDots.forEach((dot, index) => dot.classList.toggle("is-active", index === onboardingStep));
  setText(els.onboardingKicker, `Start here · ${onboardingStep + 1} of 3`);
  if (els.onboardingBack) els.onboardingBack.disabled = onboardingStep === 0;
  if (els.onboardingNext) els.onboardingNext.textContent = onboardingStep === 2 ? "Finish" : "Next";
}

function openOnboarding(force = false) {
  try {
    if (!force && localStorage.getItem(ONBOARDING_KEY) === "1") return;
  } catch {
    // If storage is unavailable, still show the guide.
  }
  onboardingStep = 0;
  setOnboardingStep(0);
  els.onboardingDialog?.showModal();
}

function closeOnboarding({ markSeen = true } = {}) {
  if (markSeen) {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }
  els.onboardingDialog?.close();
}

function bindOnboarding() {
  els.onboardingSkip?.addEventListener("click", () => closeOnboarding());
  els.onboardingBack?.addEventListener("click", () => setOnboardingStep(onboardingStep - 1));
  els.onboardingNext?.addEventListener("click", () => {
    if (onboardingStep < 2) setOnboardingStep(onboardingStep + 1);
    else closeOnboarding();
  });
  els.onboardingDemo?.addEventListener("click", () => {
    closeOnboarding();
    startDemo();
  });
  els.onboardingStart?.addEventListener("click", () => {
    closeOnboarding();
    startCamera();
  });
  els.onboardingDialog?.addEventListener("click", (event) => {
    if (event.target === els.onboardingDialog) closeOnboarding();
  });
}

/* ── Boot ──────────────────────────────────────────────────── */
function boot() {
  const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
  if (!isMac) {
    const shortcut = els.commandBtn?.querySelector("kbd");
    if (shortcut) shortcut.textContent = "Ctrl K";
    els.commandBtn?.setAttribute("title", "Command palette (Ctrl K)");
    els.commandBtn?.setAttribute("aria-label", "Open command palette Ctrl K");
    const hint = document.querySelector(".transport-hint");
    if (hint) {
      hint.innerHTML = "<kbd>S</kbd> start/stop <span>·</span> <kbd>D</kbd> demo <span>·</span> <kbd>Ctrl K</kbd> commands";
    }
  } else {
    els.commandBtn?.setAttribute("aria-label", "Open command palette ⌘K");
  }
  els.video?.addEventListener("loadedmetadata", syncCanvasToVideo);
  els.video?.addEventListener("resize", syncCanvasToVideo);
  fillLanguageSelect();
  applyLanguage(profile, { initial: true });
  buildAccumulator();
  bindEvents();
  bindSettings();
  bindOnboarding();
  bindKeyboard();
  syncSettingsUI();
  runAndRenderSelfTest();
  renderDatasetList(els.datasetList, LANGUAGES);
  renderModelCards();
  renderLearnGrid(els.learnGrid, currentLearnLang);
  selectLearn(currentLearnLetter, currentLearnLang, { render: false });
  initOffline();
  initVoice();
  initTalk();
  bindLanguageDialog();
  applySpokenLanguage(settings.ttsLang, { persist: false });
  initCommandPalette();
  startTicker();
  renderTimeline();
  onAccumulatorState(accumulator.getState());

  const initialView = location.hash.replace("#", "");
  if (VIEWS.includes(initialView)) showView(initialView, { scroll: false });

  if (!window.isSecureContext && location.protocol !== "file:") {
    toast("Camera needs HTTPS or localhost. Demo, learn mode, and self-test still work.", { type: "info", duration: 6000 });
  }

  const params = new URLSearchParams(location.search);
  if (!params.has("skipOnboarding") && !params.has("kiosk")) {
    setTimeout(() => openOnboarding(), 700);
  }
  if (params.has("kiosk")) {
    setTimeout(() => enterKiosk(), 300);
  }

  console.info(
    `%cGlipter%c · studio · ${selfTestResult.passed}/${selfTestResult.total} self-tests · a Zabibu Technika product · Tehillah Kachila`,
    "color:#38bdf8;font-weight:800",
    "color:#94a3b8",
  );
}

boot();

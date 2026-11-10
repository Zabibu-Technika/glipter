/**
 * Offline sign-bank capture and export.
 *
 * This module is deliberately data-only: it accepts landmark frames, never
 * video, and it never marks an entry as reviewed. A reviewer must do that in
 * a separate, consented process. Keeping the schema strict prevents an
 * unreviewed capture from being mistaken for validated KSL data.
 */

export const SIGN_BANK_SCHEMA = "glipter.signbank/1";
export const SIGN_BANK_VERSION = "1.0.0";
export const MAX_FRAMES = 120;
export const MIN_FRAMES = 8;
const MAX_NOTES = 500;
const GLOSS_PATTERN = /^[A-Z0-9][A-Z0-9 _-]{0,31}$/;

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function cleanText(value, limit = MAX_NOTES) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function compactHand(hand) {
  const landmarks = hand?.landmarks ?? hand;
  if (!Array.isArray(landmarks) || landmarks.length !== 21) return null;
  return {
    handedness: typeof hand?.handedness === "string" ? hand.handedness : "Unknown",
    landmarks: landmarks.map((point) => [
      Number(Number(point.x).toFixed(5)),
      Number(Number(point.y).toFixed(5)),
      Number(Number(point.z ?? 0).toFixed(5)),
    ]),
  };
}

/** Convert a live engine frame into a compact, JSON-safe landmark frame. */
export function compactFrame(frame) {
  const hands = (frame?.hands ?? []).map(compactHand).filter(Boolean);
  return {
    t: Math.round(Number(frame?.timestamp ?? 0)),
    hands,
  };
}

export function captureHasHands(frames = []) {
  return frames.some((frame) => frame?.hands?.length);
}

export function validateEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== "object") return { ok: false, errors: ["entry must be an object"] };
  if (entry.schema !== SIGN_BANK_SCHEMA) errors.push(`schema must be ${SIGN_BANK_SCHEMA}`);
  if (typeof entry.language !== "string" || !/^[A-Z0-9][A-Z0-9_-]*$/.test(entry.language)) {
    errors.push("language must be an uppercase id");
  }
  if (typeof entry.gloss !== "string" || !GLOSS_PATTERN.test(entry.gloss)) {
    errors.push("gloss must be 1–32 uppercase letters, numbers, spaces, _ or -");
  }
  if (entry.consent !== true) errors.push("explicit consent is required");
  if (!Array.isArray(entry.frames) || entry.frames.length < MIN_FRAMES) {
    errors.push(`at least ${MIN_FRAMES} landmark frames are required`);
  } else if (entry.frames.length > MAX_FRAMES) {
    errors.push(`at most ${MAX_FRAMES} landmark frames are allowed`);
  } else {
    const hasHands = entry.frames.some((frame) => Array.isArray(frame?.hands) && frame.hands.length);
    if (!hasHands) errors.push("the capture contains no hand landmarks");
    if (entry.frames.some((frame) => !Array.isArray(frame?.hands))) {
      errors.push("every frame needs a hands array");
    }
  }
  if (entry.review?.status !== "unreviewed") {
    errors.push("a new capture must be unreviewed");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Build one sign-bank entry. The caller supplies consent and a gloss; this
 * function never invents a reviewer, a score, or a reviewed status.
 */
export function createEntry({
  language,
  gloss,
  english = "",
  notes = "",
  signerCode = "",
  source = "camera",
  frames = [],
  consent = false,
  capturedAt = Date.now(),
  id = "",
} = {}) {
  const entry = {
    schema: SIGN_BANK_SCHEMA,
    id: cleanText(id, 40) || `cap_${Math.random().toString(36).slice(2, 10)}`,
    language: String(language ?? "").toUpperCase(),
    gloss: cleanText(gloss, 32).toUpperCase(),
    english: cleanText(english, 80),
    signerCode: cleanText(signerCode, 16),
    source: source === "demo" ? "demo" : "camera",
    capturedAt: isoDate(capturedAt),
    consent: consent === true,
    notes: cleanText(notes),
    frameCount: Array.isArray(frames) ? frames.length : 0,
    review: { status: "unreviewed", reviewers: [] },
    frames: Array.isArray(frames) ? frames : [],
  };
  const validation = validateEntry(entry);
  return { ...validation, entry: validation.ok ? entry : null };
}

/** Build an export bundle. Bundles are unreviewed by construction. */
export function buildBundle(entries = [], { appVersion = "1.0.0", exportedAt = Date.now() } = {}) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  return {
    schema: SIGN_BANK_SCHEMA,
    schemaVersion: SIGN_BANK_VERSION,
    appVersion,
    exportedAt: isoDate(exportedAt),
    reviewStatus: "unreviewed",
    deafReviewers: 0,
    note: "Landmark captures only. No video, no signer names, no reviewer sign-off.",
    counts: signBankStats(list),
    entries: list,
  };
}

export function signBankStats(entries = []) {
  const list = entries.filter(Boolean);
  const byLanguage = {};
  let handFrames = 0;
  let reviewed = 0;
  for (const entry of list) {
    byLanguage[entry.language] = (byLanguage[entry.language] ?? 0) + 1;
    handFrames += entry.frames?.filter((frame) => frame?.hands?.length).length ?? 0;
    if (entry.review?.status === "reviewed") reviewed += 1;
  }
  return {
    entries: list.length,
    handFrames,
    reviewed,
    byLanguage,
  };
}

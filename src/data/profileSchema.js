/**
 * Validation for community-authored sign profiles.
 *
 * A profile is data + a small classify/reorder contract. This validator is
 * intentionally strict enough to prevent a profile from being published
 * without review metadata, but permissive enough for rule-based and model
 * profiles to coexist.
 */
export const PROFILE_MODES = ["static", "two-hand", "sequence"];
export const REVIEW_STATUSES = ["pending", "in-review", "reviewed", "rejected"];

export function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== "object") {
    return { ok: false, errors: ["profile must be an object"] };
  }
  if (typeof profile.id !== "string" || !/^[A-Z0-9][A-Z0-9_-]*$/.test(profile.id)) {
    errors.push("id must be uppercase letters, numbers, _ or -");
  }
  if (typeof profile.name !== "string" || profile.name.trim().length < 2) {
    errors.push("name is required");
  }
  if (!PROFILE_MODES.includes(profile.mode)) {
    errors.push(`mode must be one of: ${PROFILE_MODES.join(", ")}`);
  }
  if (typeof profile.priority !== "number" || profile.priority < 1 || profile.priority > 3) {
    errors.push("priority must be 1–3");
  }
  if (typeof profile.reorder !== "function") {
    errors.push("reorder(tokens) is required");
  }
  if (profile.mode === "sequence") {
    if (typeof profile.classifySequence !== "function") {
      errors.push("sequence profiles need classifySequence(frames)");
    }
  } else if (typeof profile.classify !== "function") {
    errors.push("static/two-hand profiles need classify(lm, lm2)");
  }
  if (typeof profile.note !== "string" || profile.note.trim().length < 10) {
    errors.push("note must state the honest limitations");
  }
  if (profile.review) {
    if (!REVIEW_STATUSES.includes(profile.review.status)) {
      errors.push(`review.status must be one of: ${REVIEW_STATUSES.join(", ")}`);
    }
    if (typeof profile.review.version !== "string" || !profile.review.version) {
      errors.push("review.version is required");
    }
    if (profile.review.reviewers && !Array.isArray(profile.review.reviewers)) {
      errors.push("review.reviewers must be an array");
    }
  } else {
    errors.push("review metadata is required (status, version, reviewers)");
  }
  return { ok: errors.length === 0, errors };
}

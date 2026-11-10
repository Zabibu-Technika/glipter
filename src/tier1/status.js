/**
 * Tier 1 status, split into engineering readiness and the human validation
 * gate. Engineering can be complete while the gate is still unmet. The UI
 * must show both numbers and must never infer reviewers from captured data.
 */

export const TIER1_ENGINEERING = Object.freeze([
  {
    id: "alphabet",
    label: "ASL / KSL fingerspelling",
    done: true,
    detail: "26-class static model, held-out frames.",
  },
  {
    id: "ksl-words",
    label: "KSL word pilot",
    done: true,
    detail: "FATHER, HELLO, IS, MY; four-word pilot.",
  },
  {
    id: "segmentation",
    label: "Rest-pose segmentation",
    done: true,
    detail: "Hand presence starts a segment; a rest run ends it and closes the word.",
  },
  {
    id: "motion",
    label: "Motion phrases",
    done: true,
    detail: "J, Z, HELLO, YES, THANK YOU, PLEASE, SORRY.",
  },
  {
    id: "sign-bank",
    label: "Sign-bank capture",
    done: true,
    detail: "Landmark-only entries, local storage, JSON export.",
  },
  {
    id: "review",
    label: "Review workflow",
    done: true,
    detail: "Unreviewed by default; reviewer names require consent.",
  },
  {
    id: "offline",
    label: "Offline PWA + voice",
    done: true,
    detail: "Service worker shell, embedded eSpeak NG, no runtime CDN.",
  },
  {
    id: "export",
    label: "Transcript export",
    done: true,
    detail: "TXT, CSV, JSON with timestamps and confidence.",
  },
]);

export const TIER1_VALIDATION = Object.freeze({
  kslStaticSignsRequired: 50,
  motionSignsRequired: 5,
  deafReviewersRequired: 20,
  preferenceTarget: 0.7,
  preferenceMeasured: null,
});

function reviewedCount(entries, language, kind) {
  return entries.filter((entry) => {
    if (entry?.review?.status !== "reviewed") return false;
    if (language && entry.language !== language) return false;
    if (kind === "motion" && entry.kind !== "motion") return false;
    return true;
  }).length;
}

/**
 * @param {Array} entries captured or imported sign-bank entries
 * @param {{ reviewersConfirmed?: number, preferenceMeasured?: number|null }} evidence
 */
export function tier1Status(entries = [], evidence = {}) {
  const engineeringDone = TIER1_ENGINEERING.filter((item) => item.done).length;
  const engineeringComplete = engineeringDone === TIER1_ENGINEERING.length;
  const kslStatic = reviewedCount(entries, "KSL");
  const motion = reviewedCount(entries, null, "motion");
  const reviewers = Math.max(0, Number(evidence.reviewersConfirmed ?? 0));
  const preference = evidence.preferenceMeasured ?? null;

  const checks = [
    kslStatic >= TIER1_VALIDATION.kslStaticSignsRequired,
    motion >= TIER1_VALIDATION.motionSignsRequired,
    reviewers >= TIER1_VALIDATION.deafReviewersRequired,
    typeof preference === "number" && preference >= TIER1_VALIDATION.preferenceTarget,
  ];
  const validationComplete = checks.every(Boolean);

  return {
    engineeringDone,
    engineeringTotal: TIER1_ENGINEERING.length,
    engineeringComplete,
    validationComplete,
    kslSignsReviewed: kslStatic,
    kslSignsRequired: TIER1_VALIDATION.kslStaticSignsRequired,
    motionSignsReviewed: motion,
    motionSignsRequired: TIER1_VALIDATION.motionSignsRequired,
    deafReviewersConfirmed: reviewers,
    deafReviewersRequired: TIER1_VALIDATION.deafReviewersRequired,
    preferenceMeasured: preference,
    preferenceTarget: TIER1_VALIDATION.preferenceTarget,
    label: validationComplete
      ? "Tier 1 · validated"
      : engineeringComplete
        ? "Tier 1 MVP · Deaf review pending"
        : "Tier 1 · engineering in progress",
  };
}

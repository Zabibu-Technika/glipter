# Community profile authoring

The Tier 3 goal is for a Deaf community to add a sign language without editing the engine. A profile is a small object with a classifier, a grammar/reordering function, honest notes, and review metadata.

## Contract

```js
export const MY_LANGUAGE = {
  id: "XYZ",
  name: "Display name",
  shortName: "XYZ",
  priority: 1,                 // 1 core, 2 secondary, 3 experimental
  mode: "static",              // static | two-hand | sequence
  classify(lm, lm2) { ... },   // or classifySequence(frames)
  reorder(tokens) { ... },
  labels: {},
  note: "What this profile does, and what it does not do.",
  review: {
    status: "pending",         // pending | in-review | reviewed | rejected
    version: "0.1.0",
    reviewers: [],             // add only with consent
    reviewedAt: null,
    notes: "",
  },
};
```

Use `validateProfile` from `src/data/profileSchema.js` before publishing.

## Authoring workflow

1. **Community lead** creates a profile file and a 10–20 sign pilot.
2. **Record** with consent; keep signer metadata separate from video.
3. **Extract** landmarks with the same MediaPipe pipeline as the app.
4. **Train** or write rules; keep a held-out signer split.
5. **Review** with native Deaf signers using `DEAF-REVIEW-KIT.md`.
6. **Publish** with version, reviewer credit, coverage, and known failures.
7. **Version** every change; never silently replace a reviewed profile.

## No-code requirements

- Record-and-label screen with camera framing and sign prompts.
- Handshape picker / rule builder for simple static profiles.
- Automatic landmark extraction and a preview of the classifier.
- Review queue with approve/request-changes and reviewer credit.
- Dataset export in a documented format.

## Dataset format

```
profile/
  profile.js
  model.json          # optional
  fixtures/
    sign-alpha.json
  card.json           # metrics, split, confusion pairs, reviewers
```

Each fixture: `{ className, landmarks | frames, source, signer, split }`. Never ship raw video without consent.

## Governance

- One named Deaf reviewer per language is not enough for “stable”; require at least two or a Deaf-led organisation.
- A profile with `review.status !== "reviewed"` must show “experimental” in the UI.
- Communities can withdraw a profile; the library must support unpublishing.
- Credit is mandatory and visible in the product, not just the repository.

## Current status

- The engine supports `static`, `two-hand`, and `sequence` profiles.
- `validateProfile` enforces the contract.
- No community-authored profile has been published yet.

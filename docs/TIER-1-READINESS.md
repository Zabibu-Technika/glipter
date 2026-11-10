# Tier 1 readiness

Glipter’s Tier 1 label is split into two separate claims:

1. **Engineering readiness** — the product has the software needed to run a Tier 1 pilot.
2. **Deaf validation** — native Deaf KSL reviewers have tested the lexicon and task performance.

Only the first is complete. The second cannot be completed by an engineer, a benchmark, or a model card.

**Current label:** `Tier 1 MVP · Deaf review pending`

## Engineering checklist

| Item | State | Evidence |
|---|---|---|
| ASL / KSL fingerspelling | Done | 26-class static model; held-out fixtures in the self-test. |
| KSL word pilot | Done | Four glosses (`FATHER`, `HELLO`, `IS`, `MY`) on the official KSL split. |
| Rest-pose segmentation | Done | `RestPoseSegmenter` runs in the live engine. A hand starts a segment; a short rest run ends it and closes the current word. |
| Motion phrases | Done | J, Z, HELLO, YES, THANK YOU, PLEASE, SORRY; conservative trajectory gates. |
| Sign-bank capture | Done | Landmark-only entries, local storage, JSON export. No video. |
| Review workflow | Done | Every capture is `unreviewed` by default; reviewer names and reviewed status require a separate consent process. |
| Offline PWA + voice | Done | Service-worker shell, embedded eSpeak NG, no runtime CDN loads. |
| Transcript export | Done | TXT, CSV, JSON with timestamps, labels, confidence, language. |

The About page renders the same checklist from `src/tier1/status.js`, so the claim and the code cannot drift apart silently.

## Validation gate

The documented Tier 1 gate is **not met**. It requires all of the following:

| Gate | Required | Current |
|---|---|---|
| Reviewed static KSL signs | 50 | 0 |
| Reviewed motion signs | 5 | 0 |
| Native Deaf KSL reviewers | 20 | 0 |
| Task preference / success | ≥ 70% | Not measured |

The KSL word model has four glosses. The KSL fingerspelling profile uses ASL-derived handshapes as a documented proxy. The phrase rules are ASL-derived experiments. None of that is a reviewed KSL lexicon.

## What “Tier 1 MVP” means here

It means the engineering surface is ready for a structured Deaf-led pilot:

- A reviewer can run the app offline.
- The app exposes rest-pose boundaries instead of silently guessing.
- A reviewer can capture a sign as landmarks, label the gloss, record a note, and export it.
- The export says `unreviewed` and `deafReviewers: 0`; it cannot be mistaken for validated data.
- The UI states the gate and the remaining counts.

It does **not** mean the app is validated, safe for high-stakes use, or a replacement for an interpreter.

## Review and data-collection flow

1. Run the camera or the on-device demo.
2. Sign one item. Pause briefly; the rest-pose boundary closes the word.
3. Open **About → Sign bank → Capture**.
4. Enter the gloss, optional English and notes, and tick explicit consent.
5. Save. The entry stays on the device as landmarks only.
6. **Export** produces `glipter-signbank-YYYY-MM-DD.json` with the schema `glipter.signbank/1`.
7. Send the export to the review lead using the process in `docs/DEAF-REVIEW-KIT.md`.

Reviewers must use the consent, compensation, credit, and deletion rules in the review kit. Do not record video unless separate consent covers it. Do not mark an entry `reviewed` without a signed rubric.

## Versioning

Each language profile now carries a product version and review metadata:

```js
version: "1.0.0",
review: {
  status: "pending",
  version: "1.0.0",
  reviewers: [],
  reviewedAt: null,
  note: "No native Deaf KSL reviewer has signed off."
}
```

The `review.status` stays `pending` until the gate is met. Reviewer names are added only with explicit consent.

## Verification

- `npm test`: **22/22** (includes rest-pose segmentation, sign-bank schema, and Tier 1 status).
- In-app self-test: **77/77** across six layers, including the segmentation/sign-bank pipeline.
- `npm run check`: 274 element IDs, 54 precached files, no runtime CDN loads.
- `npm run audit`: 0 axe violations, 0 console/page errors, 0 horizontal overflow, offline reload passes.
- Sign-bank export smoke-tested in Chromium: 72 frames, schema `glipter.signbank/1`, `reviewStatus: "unreviewed"`, `deafReviewers: 0`.

## Remaining work to close the gate

1. Record a KSL sign corpus with 50 static signs and at least 5 motion signs, with signer-independent splits.
2. Run structured sessions with 20 native Deaf KSL reviewers using `docs/DEAF-REVIEW-KIT.md`.
3. Record task success or preference against the ≥ 70% target.
4. Fix the lexicon and UI failures the reviewers find.
5. Add only then: `review.status: "reviewed"`, reviewer credits, and the `Tier 1 · validated` label.

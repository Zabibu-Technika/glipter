# Deaf-led review kit

Every Glipter language profile is **pending** review by native Deaf signers of that language. This kit is the process and evidence template; it is not a claim that review has happened.

## Principles

1. **Deaf-led, not engineer-led.** Reviewers decide whether a profile is usable, not whether the model score is high.
2. **Paid, credited, consented.** Reviewers are compensated, named with permission, and can withdraw.
3. **Language-specific.** KSL, ASL, and BSL are separate languages. Never use one reviewer for another.
4. **Limits stay visible.** A profile cannot be labelled “stable” until the review is signed and the limitations are in the UI.
5. **No surveillance.** Review recordings are stored with explicit consent and a defined retention period.

## Roles

| Role | Responsibility |
|---|---|
| Deaf reviewer (native signer) | Judges correctness, naturalness, cultural fit, and whether the tool helps. |
| Interpreter / language consultant | Supports communication between the review team and engineers; not a substitute for reviewer judgement. |
| Product lead | Runs sessions, records issues, ships fixes, keeps the changelog. |
| Data steward | Owns consent, storage, access, and deletion. |

## Session protocol (60–90 minutes)

1. **Consent & context** (10 min): purpose, recording, compensation, right to stop.
2. **Warm-up** (5 min): sign naturally, confirm camera framing.
3. **Task 1 — live recognition** (15 min): sign a scripted set of letters/words; note what the tool shows.
4. **Task 2 — practice** (10 min): use Learn → Practice; note whether the target/feedback is useful.
5. **Task 3 — real task** (15 min): e.g. a school-office or clinic-counter scenario.
6. **Voice bridge** (10 min): ASR/TTS if relevant; note network/privacy concerns.
7. **Interview** (15 min): trust, usefulness, failure modes, what would make it usable.
8. **Close** (5 min): compensation, credit preferences, follow-up.

## Rubric (1–5 each)

- Correctness of handshape/lexicon.
- Grammar and naturalness.
- Visual clarity and confidence feedback.
- Usefulness for the scripted task.
- Trust and transparency (does the UI overclaim?).
- Would the reviewer use it with a Deaf peer? Why/why not?

Record verbatim examples for failures. A high model accuracy with poor task usefulness is a **fail**.

## Sign-off gate

A profile may move from `experimental` to `reviewed` only when:

- At least **two native Deaf reviewers** (or one reviewer plus a Deaf-led organisation) sign off.
- The profile’s known failures and limitations are documented.
- The UI shows the review status, version, and reviewer credit.
- The evaluation dashboard lists signer-independent accuracy, not just same-corpus accuracy.

## Profile metadata (code)

```js
review: {
  status: "pending" | "in-review" | "reviewed" | "rejected",
  version: "1.0.0",
  reviewers: [{ name: "…", org: "…", language: "KSL", consented: true }],
  reviewedAt: "2026-…",
  notes: "What was tested, what failed, what changed."
}
```

The current profiles are all `pending` with an empty reviewer list. Do not add names without consent.

## Reviewer credit template

```
Reviewer: [name / organisation]
Language: KSL
Version reviewed: 0.1.0
Scope: fingerspelling subset / four-word pilot
Outcome: changes requested / approved for Tier 1 pilot
Credit preference: name + organisation
```

## Data handling

- Record only with written or recorded consent.
- Store on an encrypted drive with access limited to the review lead and data steward.
- Delete raw video after the agreed retention period; keep only the signed rubric and anonymised notes.
- Never use review footage to train a model without a separate consent.

## Current status

- ASL: **pending**
- KSL: **pending**
- KSL words: **pending**
- BSL: **pending**

Captured sign-bank entries are exported from About → Sign bank as unreviewed `glipter.signbank/1` JSON. That export is input to this process, not evidence that review happened.

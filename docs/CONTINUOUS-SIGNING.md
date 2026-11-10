# Continuous signing — architecture and gates

Glipter’s KSL word mode is an isolated-word pilot: a sliding 24-frame window classifies one of four glosses. The audit correctly identifies continuous signing as the next real product gap. This document is the execution plan; it is not a claim that continuous recognition exists.

## Problem

Continuous signing requires:

1. **Segmentation** — where a sign starts and ends.
2. **Co-articulation** — hands do not reset neatly between signs.
3. **Motion** — path, repetition, hold, and handshape change carry meaning.
4. **Two-handed interaction** — dominance, contact, occlusion, role switching.
5. **Non-manual grammar** — eyebrows, mouthing, head tilt, body shift.
6. **Grammar** — S-O-V order, questions, negation, conditionals.

A static handshape classifier cannot solve these by adding more classes.

## Current scaffold

- `src/engine/engine.js` maintains a 60-frame buffer for sequence profiles and classifies every 6 frames.
- `src/lib/features.js` resamples sequences to 24 frames and builds mean/std/min/max/delta/motion summaries.
- `src/languages/kslWords.js` wraps the four-word model.
- `src/engine/demo.js` can replay sequences without a camera.
- `src/lib/segmentation.js` provides the Tier 1 rest-pose/pause segmenter. It is wired into the live engine: a hand starts a segment, a six-frame rest run ends it, and the boundary closes the current word. It is not a learned boundary model.

## Target architecture

```
camera → landmarks (+ face/pose later)
       → motion/rest segmentation
       → temporal encoder (TCN / small transformer)
       → gloss decoder (per-language lexicon + grammar constraints)
       → text
```

- **Front-end:** MediaPipe Tasks HandLandmarker now; add a lightweight holistic/non-manual model later.
- **Temporal model:** 30–120 frames, quantised int8, <15 MB.
- **Segmentation:** start with rest-pose + pause contract (Tier 1), then a learned boundary head (Tier 2).
- **Decoder:** constrained lexicon, not an unconstrained LLM. KSL grammar is not English.
- **Personalisation:** a small adapter calibrated per signer (hand size, speed, camera angle).

## Data requirements

- 5,000–10,000 KSL glosses for a useful lexicon; 40–60 Deaf signers; regional/age diversity.
- Continuous sentence recordings with gloss and boundary annotations.
- Non-manual annotations: eyebrows, mouth, head, body.
- Signer-independent train/test splits; report worst-signer accuracy.
- Consent, compensation, and withdrawal process (see `DEAF-REVIEW-KIT.md`).

## Gates

| Stage | Gate |
|---|---|
| Tier 1 | Pause/rest-pose segmentation; 50 static signs; 5 motion signs; 20 Deaf reviewers; task success ≥70%. |
| Tier 2 | 30-second continuous KSL sentence; ≥80% gloss recall on a held-out signer; p95 latency <100 ms on mid-range Android. |
| Tier 2 | Public evaluation dashboard: per-signer, per-class, confusion pairs, coverage. |
| Tier 3 | Community-authored profiles; two additional African SLs with named Deaf reviewers. |

## Risks

- **Data scarcity** — SLAIT’s pivot from translation to lessons is a warning; do not overpromise before the data exists.
- **Non-manual signals** — hands-only models will plateau; face/pose is not optional for grammar.
- **Benchmark leakage** — frame-level splits inflate accuracy; split by signer.
- **Edge budget** — a large temporal model breaks the low-end device promise; quantise and gate by device.

## Next implementation steps

1. ~~Add rest-pose segmentation tests and wire the segmenter into the KSL buffer.~~ Done: live engine + Node test + self-test layer.
2. Record a 100-sentence KSL pilot with boundaries and Deaf review.
3. Train a small TCN on landmark sequences; compare against the current summary MLP.
4. Add a signer-independent evaluation split and publish it.
5. Only then add “continuous (beta)” to the UI.

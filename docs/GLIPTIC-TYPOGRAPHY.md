# Gliptic Typography

**Gliptic Typography** is Glipter’s proposed text → sign visual shorthand: a compact, readable glyph language for handshape, orientation, location, and motion — without a 3D avatar or video stream.

## Why not an avatar

The audit and competitor research show a crowded avatar market (Signvrse/Terp 360, Signapse, SignAll). Avatars are expensive, cloud-heavy, and slow on low-end hardware. They are also a different direction: speech/text → sign for broadcast and announcements. Glipter’s primary direction is sign → text, with a lightweight text → sign aid.

## Glyph anatomy

A full Gliptic glyph should carry:

1. **Handshape** — the 21-point landmark silhouette or a simplified palm/finger diagram.
2. **Orientation** — palm facing the viewer / away / left / right.
3. **Location** — neutral space, chest, forehead, non-dominant palm.
4. **Motion** — path arrow, repetition mark, hold bar, handshape change.
5. **Non-manual marker** — eyebrow/mouth/head cue where relevant.

## Current implementation (experimental)

The Learn view now includes a **Type to handshape** panel. It:

- Uses the bundled ASL/KSL medoid prototypes for A–Z.
- Renders a horizontal glyph strip for a typed word.
- Shows spaces and unsupported characters.
- Is labelled experimental and does not claim to encode orientation, motion, location, or grammar.

This is deliberately a **handshape-only** first step. It is useful as a visual reference and a foundation for community review.

## What is missing

- Orientation and location diagrams.
- Motion arrows and repetition.
- Non-manual grammar.
- A compact inline SVG glyph font (current glyphs are HTML cards).
- Deaf review of legibility and cultural fit.
- A text → gloss → glyph pipeline with KSL grammar.

## Evaluation

- Ask Deaf ASL/KSL signers to read a set of short phrases in Gliptic Typography and write the meaning.
- Measure comprehension, speed, and error patterns against video and avatar baselines.
- Reject glyphs that are ambiguous or culturally wrong.
- Publish the glyph set and review notes.

## Design rules

- One glyph = one sign unit, not one English letter.
- Prefer spatial layout over linear text when location matters.
- Use arrows only for motion; do not decorate.
- High contrast, scalable, readable at 16 px.
- Provide a text fallback and a video/demo fallback.

## Status

**Experimental / handshape-only.** No Deaf review yet. Do not present it as a full sign language rendering.

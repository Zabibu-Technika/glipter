# Glipter design principles

These are the rules the current UI is built against. They are not a mood board; each one maps to a concrete part of the app.

## 1. One primary action per state

- Idle camera: the empty state owns **Start camera**; the toolbar does not duplicate it.
- Running: the toolbar exposes **Stop**; Start is hidden.
- Voice: **Listen** and **Speak** are the only primary actions in their panels.
- Learn: **Start practice** is the primary action; the alphabet remains reference material.

**Why:** users should not have to choose between two identical calls to action.

## 2. Progressive disclosure

- Live inspector shows the current sign, confidence, state message, English translation, and Copy/Speak first.
- Gloss stream, top-3 candidates, session stats, model notes, Undo/Clear/Export live under **Details**.
- Mirror, skeleton, Settings, and Kiosk live under the camera overflow menu.
- Advanced preferences live in the Settings dialog, not on the workspace.

**Why:** the technical surface is available, but it does not compete with the translation.

## 3. Clear hierarchy

- Page → panel → content: one `h1` per view, one panel title, one primary number/string.
- Current sign is the largest element; English is second; controls are tertiary.
- Technical labels use mono; human content uses the sans stack.
- Studio uses ink outlines and a single accent; the camera viewport stays dark so the video is the focal point.

## 4. Feedback and state

- Confidence has **high / mid / low / idle** colour states, not just a bar.
- The state line says what to do: “Start the camera or demo to begin”, “Waiting for a sign”, “Hold steady — not sure yet”, “Sign committed”.
- Commit triggers a short pulse and optional haptic.
- Empty streams use human placeholders instead of em dashes.
- Errors are actionable: Retry / Dismiss, with friendly camera messages.

**Why:** a user should always know what the system is doing and what to do next.

## 5. Consistency

- Studio, Midnight, and Daylight share the same layout and tokens; only variables change.
- Buttons follow primary / secondary / ghost hierarchy.
- Icon buttons always have accessible names; visible labels are included in the accessible name.
- Dialogs share headers, sticky actions, and Escape-to-close.

## 6. Accessibility is the baseline

- WCAG 2.2 AA automated checks are clean (0 axe violations).
- 24×24 target minimum everywhere; 44×44 on mobile.
- Commit-only live region; no per-frame screen-reader spam.
- Reduced motion, high contrast, large text, focus-visible, skip link.
- Copy is never audio-only; TTS is optional and local-first.

## 7. Responsive by task, not by shrinking

- Mobile: camera → inspector → timeline; bottom tab bar; 44 px controls.
- Tablet: stacked at 768, split at 1024; icon rail with labelled tooltips.
- Desktop: split studio, capped at 1560 px; wide screens do not stretch the camera forever.
- Kiosk: full-screen capture, no chrome, explicit exit.

## 8. Trust by design

- “Tier 1 MVP · Deaf review pending” copy, model cards, and visible limitations.
- Every language profile shows `review: pending`; no fake reviewers.
- ASR network caveat is persistent; TTS notes whether a local voice exists.
- Dataset and licence attribution is one click away in About.

## 9. Learning by doing

- Learn provides reference, a per-letter cue, and a **watch → try → feedback** practice loop.
- Practice shows a target, success/wrong feedback, progress, and haptics.
- Gliptic Typography is labelled experimental and handshape-only.

## 10. Conversation first, phone first

- The primary surface is **Talk** with three zones: camera, one conversation thread, and controls. They rearrange by screen size but never multiply.
- Signed English appears in the thread and in a floating live caption; the old separate Translation panel is gone from Talk.
- Primary navigation is **Talk · History · Learn**; Settings is one action. Voice and About are secondary.
- Language is **one decision**: a single picker drives sign language, spoken language, ASR, quick phrases, and the sign-back preview.
- Low-confidence words carry a dotted underline and can be corrected by tapping.
- Technical readouts live in a **Details drawer**, not on the default screen.
- **Present** widens the thread; **Face-to-face** rotates it on tablet portrait; phone thread has peek/half/full heights.
- Mobile order is camera → conversation; desktop uses a camera + thread split.
- Replies can arrive by microphone, typing, or a quick phrase. The quick phrase board is the offline path when ASR is unavailable.
- The voice is **embedded** (eSpeak NG), not an OS voice. It covers English and African languages and works with the network off.
- Camera detection and TTS degrade explicitly: no WebGL → demo/phrase board; no system voice → embedded voice; no ASR → quick phrases/typing.

## 11. Performance as UX

- Critical app shell ≈1.2 MB; vendor MediaPipe loads only when the camera starts.
- Lite model, low-power preset, and ~15 fps option for weak devices.
- Offline PWA with a visible cache state.

---

If a future change violates one of these, it needs a written reason. The design audit in `DESIGN-AUDIT.md` and the recommendation status in `RECOMMENDATIONS-STATUS.md` are the evidence trail.

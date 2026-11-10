# Glipter UX redesign — an app for everyday people

**Date:** 10 November 2026
**Goal:** make Glipter immediately understandable to someone who has never used a sign-language app, without losing the honest limits.

## Research used

The redesign follows the current mobile-first consensus rather than adding decoration:

- [Mobile app design: principles, process and examples (2026)](https://base44.com/guides/mobile-app-design) — 44 pt touch targets, 3–5 bottom destinations, one clear primary action, one task per screen.
- [Mobile Navigation Design: 8 Types, Examples & Best Practices (2026)](https://www.uxpin.com/studio/blog/mobile-navigation-examples) — bottom navigation for 3–5 primary tasks; bottom sheets for supplementary actions; progressive disclosure.
- [Mobile App UI/UX Design Trends for 2026](https://www.9falcons.com/blogs/mobile-app-ui-ux-design-trends/) — thumb-first navigation, primary actions in the bottom third, accessibility as a baseline, progressive onboarding.
- [UI/UX Best Practices for Mobile Apps in 2026](https://www.devversemedia.com/blog/ui-ux-best-practices-mobile-2026) — clarity over cleverness, consistent spacing, immediate feedback, test with real users.
- [Validate Progressive Disclosure in Two Sprints](https://raw.studio/blog/progressive-disclosure-ux) — primary vs secondary tiers; mobile disclosure is a structural requirement, not a nice-to-have.
- [Mobile UI Patterns 2026](https://gendesigns.ai/blog/mobile-ui-patterns-2026) — bottom tabs for primary navigation; lists/cards for content; sheets for secondary content.

## What changed

### 0. Three zones, one screen

The old split was camera + conversation + translation panel. The translation panel is gone from Talk. The screen is now:

1. **Camera** — hero on the left (desktop) or full width (phone).
2. **Conversation** — one thread with signed and spoken bubbles.
3. **Controls** — quick phrases, type, Speak reply, Play translation, all under the thread.

Signed English is no longer pushed into a small technical box. It appears in the latest-caption overlay and in the signed bubble. The old inspector survives only as a **Details** drawer opened from the camera header.

### 0b. Calm feedback and correction

- A thin **status ring** around the camera moves through idle → hand found → committing → committed instead of showing “0 hands”, fps, or latency.
- Low-confidence words get a **dotted underline** in the thread; tapping one opens a correction dialog.
- The commit still triggers the existing haptic pulse and animation.
- Technical readouts (confidence, top-3, gloss, stats, backend) live in the Details drawer.

### 0c. One thread, two voices

- Every bubble carries a small language chip: KSL, English, Kiswahili, etc.
- Signed bubbles show English plus the spoken-language translation when the phrase pack has one.
- Spoken and typed replies sit in the same thread, with the speech-to-sign preview directly below.
- **Present** mode widens the thread for a hearing partner on desktop.
- **Face-to-face** mode rotates the thread on tablet portrait for the person across the table.
- On phones the conversation card has **peek / half / full** heights controlled by one handle.

### 0d. Copy rules

Every sentence now has to earn its place:

- Camera empty state: **“Show your hand to start.”** One line, one button.
- Conversation empty state: **“Say hello.”**
- History empty state: **“No signs yet.”**
- Page headers: title + actions only; no repeated subtitle.
- Technical explanations live in About or the Details drawer.
- Voice caveats are hidden until needed; the main Talk screen has no ASR/TTS paragraph.
- Learn cards use a short **“ASL-based · pending”** label; the full review caveat is in the detail panel.
- Settings descriptions are removed where the control label is already clear.

The test is simple: a Deaf user who reads KSL more comfortably than written English should not have to read a paragraph before starting.

### 0e. Navigation and Learn

- About, Voice, model cards, datasets, and roadmap moved behind Settings / About. Talk, History and Learn are the only primary destinations.
- Learn now follows the one top-bar language picker; the duplicate ASL/KSL/BSL toggle is hidden.
- Learn cards say **“ASL-based · pending”** with the full “KSL review pending” context in the detail panel, instead of implying verified KSL. The detail panel says “reference only” rather than a misleading 100% learner score.
- The main header/footer no longer shows timers, fps, latency, model names, self-test, or a Tier 0 badge.

### 1. Three primary destinations

The rail/bottom bar is now **Talk · History · Learn**. Settings is a single top-bar action. Voice and About are secondary screens reached from Settings, not equal-weight tabs.

This follows the research rule of 3–5 primary destinations. It removes the feeling of a developer console with many equal workspaces.

### 2. One obvious first action

Talk opens with:

- **Start signing** as the primary button.
- **See a demo** as the secondary escape hatch.
- A plain-language explanation: “Sign naturally. Glipter translates on this device — nothing is uploaded.”
- A clear three-step onboarding: choose languages → start signing or speaking → read the translation.

The technical camera toolbar is reduced to status, Demo, and an overflow menu.

### 3. A language picker instead of a settings scavenger hunt

The top-bar language button opens one dialog:

- **I sign:** KSL, ASL, BSL, KSL words.
- **I speak / hear:** English, Kiswahili, Afrikaans, Amharic, Setswana, Oromo, Tigrinya.

That single choice now drives:

- the embedded eSpeak voice language,
- speech-recognition language,
- the quick phrase board,
- the speech-to-sign preview,
- a small offline phrase-pack translation for signed English spoken output.

The current choice is visible in the top bar (`KSL · Kiswahili`). The details remain available in Settings, but users do not need to find five separate selectors. The translation pack covers common conversation phrases and the demo sentence; unusual sentences stay in English until a larger offline translation model is added.

### 4. Plain language over engine language

| Before | Now |
|---|---|
| Inspector | Translation |
| Gloss stream | Recognised signs |
| Tokens | Signs |
| Tier 0 chip in the app bar | Removed from the primary UI; limitations remain in About |
| Workspace / KSL / TIER 0 crumb | One language button |
| Session timeline in the main workspace | History screen |
| Voice/About tabs | Secondary screens from Settings |

The technical material is not deleted. It is moved behind **Advanced details**, **Voice & speech**, and **About Glipter**.

### 5. Mobile first, desktop second

- Mobile: camera → Talk thread → translation → (History via tab) with a 3-item thumb-reachable bottom bar.
- Desktop: camera + Talk in the main column, Translation on the right; the same three primary destinations.
- Metrics and diagnostics are hidden from the everyday status bar; they remain in About and the advanced inspector.

### 6. Visual direction

The default theme is now **Light** — a calm neutral surface, one blue accent, soft borders, and generous spacing. Studio (lilac/sticker) and Midnight remain available for people who want them. This is deliberately less “demo skin” and more everyday product.

### 7. Accessibility and feedback

- Mobile: **0 controls under 44 px**, desktop/tablet: **0 under 24 px**.
- Axe: **0 violations** across 7 runs.
- Language dialog is a native `<dialog>` with a clear primary action.
- The Talk thread is an `aria-live` region; the current language is announced in the button label.
- Empty states explain what will happen rather than showing technical placeholders.
- The quick phrase chips and reply input are the offline fallback when ASR is unavailable.

## What was intentionally not changed

- The Tier 0 / preview limitation is still visible in About and onboarding. Simplicity must not become overclaiming.
- The technical model cards, self-test, and dataset provenance remain available.
- The app still does not claim to be a substitute for an interpreter.
- ASR is still browser-provided; the UI says so and offers phrase/typing fallbacks.
- Spoken translation is a **small offline phrase pack**, not a general translator. Unknown sentences remain in English and are spoken by the selected voice.

## Evidence

- `docs/audit/simple-mobile.png` — the new mobile Talk screen in the Light theme.
- `docs/audit/language-dialog-mobile.png` — the one-screen language picker.
- `docs/audit/audit-data.json` — viewport, target-size, overflow, and axe measurements.
- `docs/DEEP-AUDIT-2026-11-10.md` — recognition/TTS/two-way audit.

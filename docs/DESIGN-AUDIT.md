# Glipter Studio — Professional Design Audit

**Date:** 5 November 2026
**Product:** Glipter Studio (Tier 0 demonstrator)
**Audit scope:** UI/UX, QA, accessibility, ease of use, responsive behaviour (mobile, tablet, desktop), brand and competitive positioning
**Prepared for:** Zabibu Technika · Tehillah Kachila

> **Update, 10 November 2026:** the recognition, mobile-detection, phrase/motion, embedded-TTS, and two-way conversation work is covered in [`DEEP-AUDIT-2026-11-10.md`](DEEP-AUDIT-2026-11-10.md). The everyday-person navigation, language picker, and Light-theme redesign is in [`UX-REDESIGN-2026-11-10.md`](UX-REDESIGN-2026-11-10.md). This document remains the visual/accessibility audit.

---

## 1. Executive summary

Glipter Studio now reads as a **credible edge product**, not a landing page. The app shell, split-pane studio, inspector, timeline, command palette, status bar, voice bridge, offline PWA, and dataset-backed models form a coherent product surface. The audit found a short list of real defects; the P0/P1 items were fixed during the audit, and the automated accessibility suite is now clean.

**Verdict:** a strong Tier 0 seed and a differentiated product direction. It is **not yet iconic and not yet validated**. The next gains are in learning design, first-run onboarding, continuous recognition, and Deaf-led review — not more visual polish.

### Scorecard

| Dimension | Score | Notes |
|---|---:|---|
| Visual design & brand | 4.5 / 5 | A real theme system now: **Studio** (lilac/cream, thick ink outlines, sticker cards), **Midnight**, and **Daylight**. The hand-constellation motif, commit animation, and playful hand glyphs are coherent. A true confidence ring is still an opportunity. |
| Information architecture | 4.5 / 5 | Rail + views + inspector + command palette is clear and desktop-grade. |
| Core live-recognition UX | 4.5 / 5 | Current sign, confidence, top-3, gloss, English, timeline, framing guide, ghost, commit animation, haptics. |
| Mobile UX | 4.0 / 5 | Camera → inspector → timeline; 0 targets below 44 px at 320/390; kiosk and onboarding work. |
| Tablet UX | 4.5 / 5 | Stacked and split layouts; labelled rail tooltips; touch targets still desktop-sized at 768 for mouse-class controls. |
| Desktop UX | 4.5 / 5 | Strong split-pane composition; capped studio width at 1560 px; framing guide and ghost. |
| Accessibility (WCAG 2.2 AA) | 4.5 / 5 | 0 axe violations across 7 view/theme runs; 0 targets below 24 px; contrast fixed. Screen-reader and Deaf usability sessions are still pending. |
| Performance | 4.0 / 5 | ~1.24 MB cold transfer, ~1.38 s DCL on localhost, 9.5 MB cold heap. Vendor assets load on demand. |
| Trust & ethics | 5.0 / 5 | Honest Tier 0 labels, dataset provenance, licences, credits, review metadata, model cards. |
| Learn / education | 4.0 / 5 | Legible upright handshapes, per-letter cues, watch→try→feedback practice, Gliptic Typography. Deaf-reviewed illustrations are the next step. |
| QA | 4.5 / 5 | 19/19 tests, 74/74 self-tests, static check, offline reload, demo pass, CI audit workflow. Device lab and screen-reader runs remain. |
| Iconic potential | 4.0 / 5 | Studio theme + hand constellation + commit pulse + Gliptic Typography is a distinctive direction. The signature confidence ring and Deaf co-design are the next level. |

### What is working

- **App-like IA:** rail, views, inspector, timeline, status bar, command palette, settings dialog.
- **Task-first Live flow:** one primary action per state, primary output first, advanced detail on demand.
- **Three coherent themes:** Studio (default lilac/cream), Midnight, and Daylight.
- **Keyboard-first workflow:** `1–5`, `S`, `D`, `M`, `T`, `C`, `E`, `Ctrl/Cmd K`.
- **Offline-first proof:** service worker precaches 52 runtime entries; offline reload passed with self-test intact.
- **Real data, real models:** ASL 10,508 samples / 99.9% held-out; KSL 818 sequences / 99.2% held-out (same-corpus, not signer-independent).
- **Learning loop:** per-letter cues, watch→try→feedback practice, Gliptic Typography.
- **Two-way bridge:** browser ASR + local-first TTS, with honest network caveats.
- **Trust signals:** Tier 0 badge, dataset cards, model cards, self-test 74/74, credits to Tehillah Kachila and Zabibu Technika.

### Top risks

1. **Deaf-led validation is still missing.** No profile has been reviewed by native Deaf signers.
2. **Learn still needs Deaf-authored illustrations.** It now has cues and a practice loop, but the landmark skeletons are not a substitute for professionally drawn, culturally reviewed handshapes.
3. **Continuous signing is absent.** Isolated handshapes are the easy part; the product gap is segmentation, motion, and non-manual grammar.
4. **Offline ASR is not shipped.** Browser ASR may use a network service; the text fallback is clear, but a local ASR model is still research.
5. **The signature interaction is close but not complete.** The hand constellation and commit pulse are present; a true confidence “commit ring” and Deaf co-design are the next level.

---

## 2. Method and evidence

### Method

- **Heuristic evaluation** against Nielsen’s ten heuristics and app-specific task flows.
- **WCAG 2.2 AA** automated checks with axe-core, plus manual checks for focus order, live regions, target size, contrast, motion, and text scaling.
- **Platform guidance:** Apple Human Interface Guidelines, Material 3, Fluent 2, and modern app patterns (command palette, progressive disclosure, offline-first, micro-interactions).
- **Responsive sweep** at 390×844, 768×1024, 1024×768, 1440×900, 1920×1080.
- **Task tests:** start camera, play demo without camera, switch language, inspect recognition, export transcript, open command palette, use Voice, inspect Learn, read About, reload offline.
- **Tooling:** Playwright (Chromium headless), axe-core 4.10, Node test runner, the app’s own 74-check self-test, static asset/ID checker.
- **Implementation rules:** [`DESIGN-PRINCIPLES.md`](DESIGN-PRINCIPLES.md) is the current contract: one primary action per state, progressive disclosure, clear hierarchy, feedback, consistency, accessibility, responsive task order, trust, learning by doing, performance.

### Evidence

- Raw audit data: [`audit-data.json`](audit/audit-data.json)
- Screenshots: [`docs/audit/`](audit/)
  - Desktop Studio (default): [`desktop-live.png`](audit/desktop-live.png)
  - Mobile Studio: [`mobile-live.png`](audit/mobile-live.png)
  - Small mobile 320: [`small-mobile-live.png`](audit/small-mobile-live.png)
  - Tablet Studio: [`tablet-live.png`](audit/tablet-live.png)
  - Midnight theme: [`desktop-dark-live.png`](audit/desktop-dark-live.png)
  - Daylight theme: [`desktop-light-live.png`](audit/desktop-light-live.png)
  - Learn: [`desktop-learn.png`](audit/desktop-learn.png)
  - Onboarding: [`desktop-onboarding.png`](audit/desktop-onboarding.png)
  - Practice: [`desktop-practice.png`](audit/desktop-practice.png)
  - Voice: [`desktop-voice.png`](audit/desktop-voice.png)
  - About: [`desktop-about.png`](audit/desktop-about.png)
  - Command palette: [`desktop-command-palette.png`](audit/desktop-command-palette.png)
  - Settings: [`desktop-settings.png`](audit/desktop-settings.png)
  - Demo with hand overlay: [`desktop-demo-hand.png`](audit/desktop-demo-hand.png)
  - Offline reload: [`offline-live.png`](audit/offline-live.png)

### Final automated results

| Check | Result |
|---|---|
| axe-core violation runs (7 view/theme combinations) | **0 violations**; 40–43 passes per run |
| Horizontal overflow at all six viewports (320, 390, 768, 1024, 1440, 1920) | **None** |
| Interactive targets under WCAG 2.2 AA 24×24 | **0** |
| Interactive targets under Apple HIG 44×44 on mobile | **0** at 320/390; 17 mouse-sized controls on tablet/desktop |
| Console errors | **0** |
| Uncaught page errors | **0** |
| App self-test | **74/74** |
| Node test suite | **19/19** |
| Static checker | Passing — all referenced IDs and precache files present; **0 runtime CDN loads** |
| Offline reload | **Pass** — title, self-test, and shell restored offline |
| Demo pipeline | **Pass** — `HELLO MY NAME IS GLIPTER` completes once, stops, and shows 5 tokens / 5 timeline items with the hand overlay present; replay starts clean |
| Onboarding / practice / kiosk / filters / type-to-sign | **Smoke-tested**; onboarding step flow, practice success/wrong, kiosk exit, transcript filter, and 5-glyph HELLO strip verified |
| Cold load (localhost, service workers blocked) | 31 resources · 1,240 KB · DCL 1.38 s · load 1.42 s · 9.5 MB heap |

> Automated accessibility is not validation. A screen-reader pass (NVDA/VoiceOver/TalkBack) and a Deaf-led usability session are still required.

---

## 3. What changed during the audit

These were found and fixed in the audit build:

| Area | Fix |
|---|---|
| ASR accessibility | Added an accessible name to the icon-only “clear speech text” button. |
| Landmark semantics | Replaced nested `<aside>` complementary landmarks with labelled `<section>` regions; removed duplicate Live landmark names. |
| `top3` ARIA | Added `role="group"` so `aria-label` is allowed. |
| Light theme | Camera placeholder title/body were dark-on-black; now fixed light-on-dark in both themes. |
| Mobile ordering | Camera → Inspector → Timeline. The recognized sign is no longer below the timeline. |
| Touch targets | Primary mobile actions raised to 44 px; icon buttons and switches increased; 24 px WCAG minimum now passes everywhere. |
| Learn handshapes | Prototypes are rotated upright, drawn with thicker lines, larger tips, and a palm fill. |
| Contrast | Raised `--faint`, fixed `kbd` contrast, underlined inline dataset links, strengthened dataset/fine-print text. |
| Screen-reader noise | Removed per-frame `aria-live` from the current sign/gloss/English; added a commit-only `#sign-announcer`. |
| Command palette | Added combobox semantics (`aria-activedescendant`, `aria-controls`, expanded state). |
| Camera framing | Added subtle corner framing brackets to the capture stage. |
| Copy | “No source connected” → “Camera is off”; “1 hands” → “1 hand”. |
| Active states | Segmented filters now use a clear accent fill; active command row gets an accent rule. |
| Theme system | Added **Studio** (lilac/cream, thick ink outlines, sticker cards) as the default, plus **Midnight** and **Daylight**. Inspired by friendly sign-language teaching decks and guided-practice UIs. |
| Task-first Live | Idle uses one primary **Start camera** in the empty state; running shows **Stop** in the toolbar. Start/Stop are no longer duplicated. |
| Progressive disclosure | Inspector shows sign, confidence, state, English, Copy/Speak first. Gloss, top-3, stats, model notes, Undo/Clear/Export live under **Details**. |
| Camera overflow | Mirror, skeleton, Settings, and Kiosk moved into a **⋯** camera menu. |
| Human empty states | Streams now say “Your English translation will appear here” / “Raw recognised signs will appear here” instead of em dashes. |
| Practice entry | Learn now leads with a **Learn by doing** practice hero and target letter. |
| Small-phone polish | 320 px camera stage gets more height; idle stage chips/metrics are hidden; header wraps intentionally. |
| Onboarding | Three-step first-run dialog; replay from Settings. |
| Practice | Watch → try → feedback loop with per-letter cues, target progression, success/wrong feedback, haptics. |
| Kiosk | `?kiosk=1` / Settings; full-screen capture, app chrome hidden, exit button + Escape. |
| Transcript | Search and confidence filters with “Showing X of Y”. |
| Model cards | In-product ASL/KSL/BSL cards with split, top-1/top-3, weakest classes, confusions, review status. |
| Gliptic Typography | Type → handshape glyph strip, labelled experimental. |
| Haptics / low-power | Commit haptics, 44 px touch targets, one-hand/lite/15 fps low-power preset. |
| ASR trust | Persistent network caveat, offline warning, “Use text instead”. |
| Errors | Friendly camera error mapping, Retry/Dismiss. |
| CSP | Strict self-hosted CSP; MediaPipe assets verified under it. |

### 3.1 Studio theme — what we took from the references

The supplied references pointed to a warmer, more human learning-app language. We turned that into the **Studio** theme, now the default:

- **Lavender/cream canvas + green highlight + deep purple ink**, replacing the generic dark SaaS palette.
- **Thick ink outlines, sticker shadows, and pill actions**, inspired by the Signapse test screen.
- **Playful hand language:** upright hand glyphs with purple joints and a green palm, inspired by the illustrated ASL deck.
- **Learning-card structure:** large letter, handshape, short cue, and a practice action.
- **Guided practice:** target handshape, Start/Practice, immediate success/wrong feedback, progress.
- **Kept the dark camera viewport** for video contrast, framed by the cream app chrome — the same “browser mock around a live person” composition as the practice reference.
- **Midnight** and **Daylight** remain for users who prefer the previous dark or neutral workspace.

The reference’s playful sticky-note energy is now present in Studio, Learn, Onboarding, and Practice, while Live remains a serious capture tool.

---

## 4. Findings

Severity: **P0** blocks use or accessibility; **P1** major; **P2** polish; **P3** opportunity.

| ID | Severity | Area | Finding | Recommendation / acceptance | Status |
|---|---|---|---|---|---|
| D-01 | P0 | Accessibility | Icon-only ASR clear button had no accessible name. | Add `aria-label`/`title`. Axe critical must clear. | Fixed |
| D-02 | P0 | Accessibility | `aria-label` on a role-less `#top3` was prohibited. | Add `role="group"` and retest. | Fixed |
| D-03 | P0 | Accessibility | Nested `<aside>` complementary landmarks in Live and Learn. | Use labelled `<section>` regions. Axe moderate must clear. | Fixed |
| D-04 | P0 | Accessibility | Live view and camera panel shared the same landmark name. | Give each region a unique accessible name. | Fixed |
| D-05 | P0 | Light theme | Camera placeholder text became invisible because theme text was used on a fixed dark stage. | Fixed light colors for the stage placeholder; verify both themes. | Fixed |
| D-06 | P0 | Mobile UX | Timeline sat between camera and inspector; the current sign was below the fold. | Mobile order is camera → inspector → timeline. | Fixed |
| D-07 | P1 | Learn | Handshape cards were tiny, rotated, low-contrast clusters; the detail view was not self-explanatory. | Upright rotation, thicker strokes, palm fill, larger cards, per-letter cues, and watch→try→feedback practice. Deaf-reviewed illustrations remain a content task. | Fixed |
| D-08 | P1 | Mobile UX | Five secondary controls are 40 px, below the 44 px HIG target; WCAG 2.2 AA 24 px passes. | Raised to 44 px on mobile. Final audit: 0 controls under 44 px at 320/390. | Fixed |
| D-09 | P1 | Accessibility | Per-frame `aria-live` on the current sign would flood screen readers at 30 fps. | Removed; added commit-only announcer. Add screen-reader test. | Fixed |
| D-10 | P1 | Onboarding | No first-run guidance on language choice, KSL proxy, confidence threshold, or Voice. | Three-step “Start here” dialog, replayable from Settings; `desktop-onboarding.png`. | Fixed |
| D-11 | P1 | Learn | BSL and KSL-word learning paths are dead ends (no cards/lessons). | BSL practice is disabled with an explanation; KSL words remains a four-word pilot with its limitations surfaced. A dedicated pilot tutorial is still a content task. | Partly fixed |
| D-12 | P1 | Voice / trust | Browser ASR may use the network; the note is present but easy to miss. | Persistent network chip, offline warning, and “Use text instead”; offline ASR remains research. | Fixed |
| D-13 | P1 | QA | No Playwright/e2e or axe gate in CI; audit is manual. | `.github/workflows/audit.yml` runs the Playwright/axe audit weekly and on demand; artifacts uploaded. | Fixed |
| D-14 | P1 | QA | No real Android/tablet/camera/mic/thermal testing. | `docs/DEVICE-TEST-MATRIX.md` added; physical device runs remain. | Scaffolded |
| D-15 | P2 | Live UI | The idle camera stage is a large dark void with no framing guidance. | Corner brackets, dashed hand ghost, and “place one hand in frame” cue. | Fixed |
| D-16 | P2 | Live UI | Session timer starts on the first committed token, not when the camera/demo starts. | Session clock starts on camera/demo start and freezes on stop. | Fixed |
| D-17 | P2 | Live UI | Error banner has no dismiss/retry affordance. | Retry/Dismiss added; friendly camera-error mapping. | Fixed |
| D-18 | P2 | Transcript | No search, confidence filter, or language filter for long sessions. | Search + confidence filter + “Showing X of Y”. | Fixed |
| D-19 | P2 | Tablet | Icon-only rail is ambiguous without labels. | ARIA labels + hover/focus tooltips at 701–900 px. | Fixed |
| D-20 | P2 | Wide screens | Camera stage becomes 1428×871 at 1920 px, dwarfing the inspector. | Studio max-width 1560 px and centred; wide camera now 1176 px. | Fixed |
| D-21 | P2 | Status bar | Status/meta text is ~8.6–9.6 px. | Raised to 0.6 rem (9.6 px) with 0.54 rem labels; 768 px fit verified. | Fixed |
| D-22 | P2 | Mobile | Long language names truncate to “Kenyan Sign La…” in the header. | Compact KSL/ASL/BSL labels at ≤700 px; full name in title/desktop. | Fixed |
| D-23 | P2 | Mobile | Quick-phrase chips are 34 px high. | 44 px on mobile. | Fixed |
| D-24 | P2 | Haptics | No haptic confirmation when a sign commits or ASR starts/stops. | Haptic commit/practice patterns + Settings toggle. | Fixed |
| D-25 | P2 | Low-end devices | Lite/full model switch exists, but no “low-power” preset. | One hand + lite model + ~15 fps preset in Settings. | Fixed |
| D-26 | P2 | Trust | Accuracy claims are honest but not surfaced as a public dashboard. | In-product model cards with split, top-1/top-3, weak classes, confusions, review status. A public web dashboard is future work. | Fixed (in-product) |
| D-27 | P2 | Security | No Content-Security-Policy header. | Strict CSP + Permissions-Policy + nosniff + referrer; MediaPipe assets verified under CSP. | Fixed |
| D-28 | P3 | Brand | No single signature interaction. | Commit pulse + haptic + hand-constellation glyphs + Studio theme; a true confidence ring remains the next refinement. | Partly fixed |
| D-29 | P3 | Learn | No text → sign / Gliptic Typography. | Type-to-handshape glyph strip shipped, labelled experimental; orientation/motion/location and Deaf review remain. | Partly fixed |
| D-30 | P3 | Community | No reviewer badges/profile versions in-product. | `review` metadata on every profile; model cards show status/version/0 reviewers. Real names require consent and review. | Partly fixed |

---

## 5. Platform review

### Mobile (320×568 and 390×844)

**What works**

- No horizontal overflow at 320 or 390. Camera 306×366 / 376×370; inspector follows; timeline after.
- Bottom tab bar is familiar and thumb-reachable.
- Primary output appears immediately after the camera.
- **0 controls under 44 px** at 320/390; switches are 24 px high (WCAG 2.2 AA).
- Compact KSL/ASL/BSL language labels; 320 px header no longer truncates.
- Onboarding, practice, kiosk, and transcript filters work on the phone layout.

**Remaining**

- At 320 px the camera panel header wraps Start/Stop/Demo onto a second row. It is usable and intentional now, but a dedicated transport bar would be cleaner.
- The Voice card extends below the fold; verify the bottom-nav padding on small Android.
- Real Android/iOS camera, mic, and thermal behaviour still needs the device matrix.

### Tablet (768×1024 and 1024×768)

**What works**

- At 768, the rail collapses to 64 px icons and the studio stacks; at 1024, the split-pane returns.
- No overflow; camera/timeline/inspector all scroll correctly.
- Status bar fits at 768.

**Remaining**

- Icon-only rail now has ARIA labels and hover/focus tooltips; a fully expanded rail at 768 would still be friendlier.
- Touch targets remain mouse-sized at 768 (17 controls <44 px; 0 <24 px).
- At 1024 landscape the inspector is only 310 px; current sign and streams are readable but tight.

### Desktop (1440×900 and 1920×1080)

**What works**

- The split-pane studio is the strongest composition: camera left, inspector right, timeline below.
- One primary action per state: the empty state owns Start; running owns Stop; mirror/skeleton/settings/kiosk are in the camera menu.
- The inspector leads with the sign, confidence, state, and English; text/stream/stats are under **Details**.
- Command palette, settings, keyboard shortcuts, status bar, and offline badge create a real “workstation” feel.
- Studio, Midnight, and Daylight themes are coherent; the camera placeholder is readable in all.
- Demo without a camera proves the pipeline and is a strong sales/demo affordance.
- Framing brackets, dashed hand ghost, and “place one hand in frame” cue make the idle stage intentional.
- The Studio theme caps the wide camera at 1176 px inside a 1560 px studio.

**Remaining**

- Inspector still has empty space when idle; use it for a compact “how to sign” card or recent timeline.
- Status bar type is improved but still small; verify on 1366×768 laptops.
- A true confidence “commit ring” and Deaf co-designed hand illustrations are the next brand step.

---

## 6. Accessibility review (WCAG 2.2 AA)

### Automated

- **0 axe violations** across 7 runs: mobile Voice, desktop Voice, Studio Live, Learn, About, Daylight Live, and Midnight Live.
- Contrast violations previously found in dataset metadata, `label-note`, the `Ctrl K` hint, and the active segmented control are resolved.
- Landmark structure and `top3` ARIA are valid; command palette combobox semantics are in place.
- Target size: **0 controls under 24 px** everywhere; **0 under 44 px** at 320/390.
- All buttons have accessible names.

### Manual checklist

| Criterion | Status | Notes |
|---|---|---|
| 1.4.3 Contrast (minimum) | Pass | After `--faint`, `kbd`, dataset, fine-print fixes. |
| 2.1.1 Keyboard | Pass | Rail, dialogs, command palette, settings, voice. |
| 2.4.3 Focus order | Pass | App bar → rail → main; native dialog traps focus. |
| 2.4.7 Focus visible | Pass | 2 px accent outline with offset. |
| 2.5.8 Target size (minimum, 24×24) | Pass | 0 controls under 24 px. |
| 1.4.4 Resize text | Pass | Normal / large / extra-large settings. |
| 1.4.12 Text spacing | Partial | Layout holds at 200% zoom in the main views; test Live/Transcript at 400%. |
| 2.3.3 Animation from interactions | Pass | Reduced-motion setting + media query. |
| 1.4.1 Use of color | Pass | Confidence plus text; states have labels. |
| 4.1.2 Name, role, value | Pass | Axe clean; combobox semantics added. |
| 4.1.3 Status messages | Pass | Toasts and commit-only sign announcer. |

### Remaining accessibility risks

1. **No screen-reader session yet.** Run NVDA, VoiceOver, and TalkBack through: start camera, commit a sign, open Voice, switch language, export.
2. **Real low-end device performance** still needs the device lab; headless WebGL cannot prove MediaPipe on a budget phone.
3. **ASR is visual-only output of speech**; ensure the transcript is reachable and announced appropriately.
4. **Deaf-led usability is mandatory.** WCAG compliance does not prove a Deaf user can complete a task with the tool.
5. **Offline ASR is not shipped.** The browser may require a network; the text fallback is clear.
5. **Camera permission errors** should be announced and offer a retry; currently the banner is visual.

---

## 7. QA review

### Passing

- `npm test`: 19/19.
- `npm run check`: passing (239 IDs, 52 service-worker references, 0 runtime CDN loads).
- On-device self-test: 74/74.
- Demo pipeline: `HELLO MY NAME IS GLIPTER` completes once, stops, preserves the final English, and starts a clean session on replay.
- Offline reload: shell, models, and self-test restored with the service worker offline.
- No console or uncaught page errors.
- No horizontal overflow at 320, 390, 768, 1024, 1440, 1920.
- Onboarding, practice success/wrong, kiosk, transcript filters, and type-to-sign smoke-tested.
- Cold load localhost: 1,240 KB, 31 resources, 30 scripts, DCL 1.38 s, 9.5 MB heap.

### Gaps

- **Cross-browser:** Chromium only in this audit. Test Safari (MediaPipe/WASM, SpeechRecognition gaps), Firefox (SpeechRecognition absent), Edge (installed PWA), and iOS/Android.
- **Device lab:** 2 GB Android, mid-range tablet, old laptop, kiosk; 10-minute thermal test. Headless Chromium cannot validate MediaPipe WebGL.
- **Camera/mic hardware:** permission grant/deny, no-camera fallback, mic privacy.
- **Visual regression:** the audit captures screenshots but does not yet diff them against a baseline.
- **Large sessions:** test 500+ tokens, export size, transcript scroll performance.
- **Offline ASR:** a bundled local ASR model is not shipped.

---

## 8. Competitive analysis

| Player | Direction | Deployment / tech | Strength | What Glipter should glean |
|---|---|---|---|---|
| **Signvrse / Terp 360** | Speech/text → KSL via hyper-realistic 3D avatars; English/Swahili input; plans other African SLs by 2027 | Kenyan; avatar/motion-capture; cloud/enterprise | Closest intent; KSL-first; cultural relevance; strong storytelling | Do not fight avatar fidelity. Own the opposite edge: sign → text, offline, low-cost, Deaf-authored data, service counters and classrooms. |
| **Signapse** | Text/speech → BSL/ASL using photorealistic digital signers | UK; SignStream live, SignStudio post-production; UK stations/US airports; SaaS | Real deployments; Deaf royalties; 30% Deaf team; human-in-the-loop evaluation | Trust and distribution win. Build named Deaf reviewer credits, per-profile metrics, and human-in-the-loop review. |
| **SignAll** | Sign → text with cameras, sensors, and gloves; facial expression recognition | Hungary; hardware-heavy workstation/chat/learn lab | Non-manual features; early sign-to-text; education lab | Camera-only edge is Glipter’s advantage, but facial/non-manual features are not optional for real grammar. |
| **SLAIT** | Started real-time ASL translation; pivoted to AI interactive lessons | Spain/US; browser lessons | Honest pivot; instant feedback on signing | Cautionary tale: data scarcity can stall translation. Glipter should build the data/review engine and a “watch → try → feedback” learning loop. |
| **Google DeepMind SL2T / SignGemma** | Massively multilingual sign → text; on-device consumer features (Gboard/Live Transcribe, ASL → English) | Global platform; Pixel 11; on-device | Distribution, model quality, on-device story | The platform threat. Glipter’s defense is KSL/African SL data, community governance, offline PWA, low-end hardware, and local trust. |
| **Kara / Sorenson** | AI + human-in-the-loop sign translation; pilots | Enterprise/healthcare/public service | Trust, review, deployment | Human-in-the-loop is a feature, not a compromise. Show where humans remain essential. |
| **Lingvano / SignSchool** | Sign language learning apps | Consumer mobile | Progression, practice, feedback, streaks | Learn should teach, not just display landmarks. Add short practice loops and mastery feedback. |

### Strategic read

- **Signvrse is the closest competitor in intent**, not in product direction. It converts speech/text into KSL avatars; Glipter converts signing into text on-device. They are complementary, but they will compete for the same “KSL accessibility” narrative.
- **Signapse proves the enterprise path:** real deployments, Deaf representation, royalties, and published quality evaluation.
- **SLAIT’s pivot is a warning:** translation is a data problem before it is a model problem. Glipter’s current four-word KSL pilot is a seed, not a translator.
- **Google’s SL2T is the platform risk.** A small team cannot out-model Google, but it can out-localize, out-validate, and out-distribute in low-resource contexts.
- **The winning wedge is trust + offline + KSL-first + Deaf-led data.** Do not spend the next cycle trying to match avatar fidelity.

---

## 9. Modern design methods to adopt

1. **Jobs-to-be-done, not feature lists.** Design around three jobs: “understand a signer at a counter”, “learn a handshape”, “bridge speech and sign in a conversation”. The Live, Learn, and Voice views already map to them; make the mapping explicit.
2. **Progressive disclosure.** Keep Live simple; move advanced settings (threshold, word gap, model quality, voice) into Settings; introduce them contextually. Add a one-time three-step “Start here”.
3. **Command-first + keyboard + touch.** Keep the command palette; add grouped commands and recents. Ensure every command is reachable by touch.
4. **Offline-first, optimistic UI.** The cache progress, offline badge, and local demo are strong. Add retry/dismiss and a “download offline pack” state for slow connections.
5. **Inclusive, Deaf-led design.** Visual-first feedback, text alternatives, no audio-only alerts, high contrast, adjustable speed, haptics, captions/transcripts, and native Deaf reviewers. Sign language is cultural, not a novelty.
6. **AI trust states.** Confidence, top-3 candidates, “not sure — hold steady”, dataset/model cards, and per-version metrics. Never hide uncertainty.
7. **Micro-interactions with purpose.** Commit pulse/ring, copy confirmation, waveform, install progress. Disable decorative motion under reduced motion.
8. **Design tokens and states.** The CSS variables are a good start. Add spacing/radius/elevation/focus tokens and explicitly design loading, empty, error, offline, and partial states.
9. **Performance budgets.** Set budgets: ≤1.5 MB critical transfer, ≤1.5 s DCL on localhost, ≤20 MB installed, ≤100 ms inference on mid-range Android.
10. **Continuous research.** A 5–8 participant Deaf usability panel per language is worth more than another dashboard.

### References

- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
- Material 3 — https://m3.material.io/
- Nielsen’s 10 usability heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/
- Progressive disclosure — https://ixdf.org/literature/topics/progressive-disclosure
- 2026 UI patterns (command palettes, AI trust states) — https://www.gleamstudio.design/blog-post/ui-design-trends-2026
- Mobile patterns (progressive onboarding, micro-interactions, empty states) — https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026
- Deaf UX considerations — https://smart-interface-design-patterns.com/articles/design-for-deaf-people
- Inclusive design — https://www.nngroup.com/articles/inclusive-design/

---

## 10. How to make Glipter iconic

Glipter already has raw material: 21 landmarks, a cyan/ink palette, a hand mark, monospace data, and an “edge” story. Iconic products turn that raw material into a **repeatable ritual**.

### 10.1 The signature: “the hand constellation”

- Treat the 21 landmarks as a constellation, not a debug skeleton.
- Use the constellation in the logo, loading states, empty camera, Learn cards, and the commit animation.
- Add a **wrist ring**: a thin ring at landmark 0 that fills as confidence rises.
- Use one accent path (cyan) and one secondary path (violet); keep the rest of the interface quiet.

### 10.2 The ritual: “commit ring”

- When a sign stabilises, a ring around the current sign fills from 0 to 100%.
- At commit, the ring locks, the sign snaps 2 px, and a short haptic fires on mobile.
- If the model is unsure, the ring becomes dashed and the copy says “Hold steady — not sure yet”.
- This gives users a **physical-feeling confirmation** and makes the recognition state legible without reading telemetry.
- Under reduced motion, the ring becomes a static progress bar.

### 10.3 The visual language

- **Colour:** electric cyan `#38bdf8` as the “signal”, violet `#a78bfa` as the “interpretation”, ink `#060911` as the “edge”. No generic rainbow AI gradients.
- **Type:** humanist sans for people-facing copy, mono for machine truth (confidence, latency, IDs). Keep the system stack for offline performance.
- **Shape:** rounded but not bubbly; 1 px technical borders; a persistent grid/scan motif.
- **Motion:** constellation lines draw, confidence ring fills, waveform reacts. No endless ambient animation.
- **Copy:** plain and specific. “Camera is off.” “Sign committed.” “Not sure — hold steady.” “Offline ready.” Avoid “AI magic”.

### 10.4 The learning loop

- Adopt the “watch → try → feedback” pattern from language-learning apps and SLAIT School.
- Each Learn card: handshape illustration, a one-line cue (“A: fist, thumb alongside”), a 2-second demo, and “Try it”.
- Live practice mode: prompt a letter, show the target, give instant “close / not yet” feedback, then move on.
- Show per-letter mastery, not a global streak. Mastery is more meaningful for accessibility.

### 10.5 The community layer

- Profile cards with **named Deaf reviewers**, language, version, date, and coverage.
- “Reviewed by” badges next to each language; no review, no “stable” badge.
- Per-profile model cards with test split, per-class accuracy, confusion pairs, and known failures.
- Co-brand with Deaf associations, schools, and Zabibu Technika; make credit visible, not buried.

### 10.6 The edge identity

- Repeat the line: **“One hand. One screen. Zero cloud.”**
- Kiosk mode: full-screen, large sign, QR help, no browser chrome.
- Offline pack: a visible “Available offline” state and an install flow that explains the trade-off.
- Edge hardware story: $30 phone/kiosk, 20 MB model budget, no GPU. Make the constraints a virtue.

### 10.7 The future signature: Gliptic Typography

- A text → sign visual shorthand: handshape + orientation + motion arrow + location, rendered inline as SVG.
- Not a 3D avatar. Not a stock icon. A Deaf-reviewed visual grammar.
- This can become the iconic Glipter artifact: a “font” for sign, readable in chat, docs, and kiosks.

---

## 11. Prioritised roadmap

### Now (P0, this cycle)

- [x] Fix axe violations and landmark semantics.
- [x] Fix light-theme camera placeholder.
- [x] Reorder mobile Live to camera → inspector → timeline.
- [x] Raise primary mobile targets and switch targets.
- [x] Remove per-frame live-region noise; add commit announcer.
- [x] Add combobox semantics to the command palette.
- [x] Improve Learn handshape rendering (upright, thicker, palm fill).

### Next 2–4 weeks (P1)

- [x] One-time three-step onboarding.
- [x] Per-letter cues + “watch → try → feedback” practice loop.
- [x] Persistent ASR-offline chip and typed fallback prominence.
- [x] Error banner retry/dismiss.
- [x] Add Playwright/axe audit to CI (scheduled).
- [ ] Screen-reader pass (NVDA + VoiceOver + TalkBack) — script prepared, not executed.
- [x] Raise remaining 40 px mobile controls to 44 px; quick-phrase chips.
- [x] Tablet rail labels on hover/focus.

### Next 1-2 months (P2)

- [x] Camera framing guide + hand-placement ghost.
- [x] Session clock starts at engine start; transcript search/filter.
- [x] Wide-screen max camera width / centred stage.
- [x] Status-bar type scale; long language names on mobile.
- [x] Haptics on sign commit; low-power preset.
- [x] In-product model cards + accuracy details (public web dashboard still future).
- [x] CSP and security headers.
- [ ] Cross-browser + low-end Android/thermal test matrix — plan prepared, devices pending.

### Next 3–6 months (P3)

- [x] Continuous-signing scaffold: rest-pose segmenter + architecture/gates (`docs/CONTINUOUS-SIGNING.md`).
- [ ] Continuous KSL recognition model and signer-independent benchmark.
- [x] Kiosk mode.
- [x] Gliptic Typography handshape-only prototype.
- [ ] Deaf-led review board, signed profiles, and versioned public library.
- [x] Community profile schema + authoring specification.
- [ ] Community profile authoring UI and dataset contribution pipeline.

---

## 12. Acceptance criteria for the next review

- **Accessibility:** 0 axe violations; 0 controls <24 px; 44 px on all primary touch actions; screen-reader script passes; 400% zoom holds.
- **Responsive:** no horizontal overflow at 320/390/768/1024/1440/1920; mobile output above the fold; tablet rail labels available.
- **Performance:** ≤1.5 MB critical transfer; DCL ≤1.5 s localhost; installed ≤20 MB; inference ≤100 ms on mid-range Android.
- **Offline:** cold load once, go offline, reload, run demo, export transcript.
- **Task success:** a first-time user can start, recognize a demo sign, switch language, and export without help.
- **Deaf-led:** 5–8 native KSL signers complete a scripted school-office task; ≥70% say it helps versus no tool; no critical trust failures.
- **Voice:** ASR start/stop, permission denied, offline fallback, TTS stop, local voice detection.
- **Brand:** the “commit ring” and hand constellation are present on Live, Learn, loading, and empty states.

---

## 13. Appendix — viewport measurements

| Viewport | Overflow X | Camera | Inspector | Timeline | Rail | Targets <44 | Targets <24 |
|---|---|---|---|---|---|---|---|
| 320×568 | No | 306×366 | 306×636 | 306×? scroll | 320×58 bottom | 0 | 0 |
| 390×844 | No | 376×370 | 376×620 | 376×? scroll | 390×58 bottom | 0 | 0 |
| 768×1024 | No | 686×601 | 686×477 | 686×93 | 64×944 side | 23 | 0 |
| 1024×768 | No | 594×559 | 310×664 | 594×93 | 84×688 side | 23 | 0 |
| 1440×900 | No | 948×691 | 372×796 | 948×93 | 84×820 side | 23 | 0 |
| 1920×1080 | No | 1176×871 | 372×976 | 1176×93 | 84×1000 side | 23 | 0 |

> The 23 <44 controls on tablet/desktop are mouse-sized secondary buttons and quick-phrase chips. WCAG 2.2 AA’s 24 px minimum passes everywhere. Mobile (320/390) has **zero** controls under 44 px. The Light theme caps the wide camera at 1176 px inside a 1560 px studio.

### Axe runs

| Run | Violations | Passes |
|---|---:|---:|
| mobile-voice | 0 | 40 |
| desktop-voice | 0 | 41 |
| desktop-live | 0 | 41 |
| desktop-learn | 0 | 40 |
| desktop-about | 0 | 43 |
| desktop-light-live | 0 | 41 |
| desktop-dark-live | 0 | 41 |

### Screenshot index

| File | What it shows |
|---|---|
| `desktop-live.png` | Studio theme (default): task-first Live, one primary action, inspector summary. |
| `desktop-details.png` | Inspector **Details** disclosure: gloss, stats, model notes, actions. |
| `desktop-camera-menu.png` | Camera overflow menu: mirror, skeleton, settings, kiosk. |
| `mobile-live.png` | Studio mobile: camera → inspector → timeline; bottom nav. |
| `small-mobile-live.png` | 320×568 studio layout; no overflow; compact labels. |
| `tablet-live.png` | Studio tablet stack; icon rail; status bar. |
| `desktop-dark-live.png` | Midnight theme. |
| `desktop-light-live.png` | Daylight theme; fixed camera placeholder. |
| `desktop-learn.png` | Learn library with upright handshapes, cues, and detail panel. |
| `desktop-onboarding.png` | Three-step first-run guide. |
| `desktop-practice.png` | Practice mode with target, feedback, and hand overlay. |
| `desktop-voice.png` | ASR/TTS bridge with network caveat. |
| `desktop-about.png` | Mission, credits, datasets, model cards, limitations, offline/self-test. |
| `desktop-command-palette.png` | Keyboard-first command palette. |
| `desktop-settings.png` | Settings with theme, camera, recognition, speech, low-power, kiosk. |
| `desktop-demo-hand.png` | Demo with visible hand skeleton and live recognition. |
| `demo-complete.png` | Demo finish state: `Hello my name is Glipter` in English, 5 timeline signs, demo stopped. |
| `talk-final-mobile.png` | Mobile Talk thread: quick phrases, spoken reply, signed English, sign-back preview. |
| `talk-desktop.png` | Desktop camera + Talk + inspector layout. |
| `simple-mobile.png` | Final Light-theme mobile Talk with three-tab navigation and language button. |
| `language-dialog-mobile.png` | One-screen sign + spoken language picker. |
| `offline-live.png` | Offline reload with self-test. |
| `audit-data.json` | Raw measurements and axe results. |

---

## 14. Sign-off

**Prepared for:** Zabibu Technika · Tehillah Kachila
**Build audited:** Glipter Studio, Tier 0, source as of 5 November 2026
**Status:** All code-feasible audit recommendations executed; Studio theme shipped; 0 axe violations; 0 mobile targets below 44 px; offline reload and demo pass. Gating items remain human/research: Deaf-led review, real-device thermal/camera/mic validation, screen-reader sessions, continuous recognition, and offline ASR.

*This is an internal design/QA audit, not a substitute for validation with Deaf signers or a professional accessibility certification.*

# Audit recommendations — execution status

This is the honest status of every recommendation in `docs/DESIGN-AUDIT.md`. “Done” means shipped in the app and re-checked. “Scaffolded” means the product surface, schema, test, or plan exists but the human/research step is still required. Nothing here claims Deaf validation or real-device testing that has not happened.

| ID | Recommendation | Status | Evidence |
|---|---|---|---|
| D-01 | ASR clear button accessible name | Done | `#asr-clear` `aria-label`; axe 0. |
| D-02 | `top3` ARIA role | Done | `role="group"`; axe 0. |
| D-03 | Nested complementary landmarks | Done | Inspector and Learn detail are labelled `<section>` regions; axe 0. |
| D-04 | Duplicate Live landmark name | Done | `#view-live` uses unique `aria-label="Live workspace"`. |
| D-05 | Light-theme camera placeholder | Done | Fixed light-on-dark text in both themes; `desktop-light-live.png`. |
| D-06 | Mobile output below the fold | Done | Mobile order is camera → inspector → timeline; `mobile-live.png`, `small-mobile-live.png`. |
| D-07 | Learn handshape legibility + teaching | Partly done | Upright, thicker, palm-filled glyphs; per-letter hints; practice loop with success/wrong feedback. Still needs illustrations and Deaf-reviewed cues. |
| D-08 | 44 px touch targets on mobile | Done | 0 controls under 44 px at 320/390; 0 under 24 px everywhere. |
| D-09 | Per-frame live-region spam | Done | Removed; commit-only `#sign-announcer`; screen-reader script still required. |
| D-10 | First-run onboarding | Done | Three-step `#onboarding-dialog`, replay in Settings; `desktop-onboarding.png`. |
| D-11 | BSL/KSL-word learning dead ends | Partly done | BSL practice disabled with explanation; KSL words remains a pilot. A dedicated pilot panel is still a content task. |
| D-12 | Persistent ASR network caveat + fallback | Done | `#asr-network` chip, offline warning, “Use text instead”; `desktop-voice.png`. |
| D-13 | Audit in CI | Done | `.github/workflows/audit.yml` (manual + weekly), artifacts uploaded. |
| D-14 | Device/browser/thermal matrix | Scaffolded | `docs/DEVICE-TEST-MATRIX.md`; phones/tablets/kiosk still need physical runs. |
| D-15 | Camera framing/ghost/cue | Done | Corner brackets, dashed hand ghost, “Place one hand in frame”; `desktop-live.png`. |
| D-16 | Session clock starts at engine start | Done | `startSessionClock` / `stopSessionClock`; runs during demo/camera. |
| D-17 | Error banner retry/dismiss | Done | `#error-retry` / `#error-dismiss`; friendly camera error mapping. |
| D-18 | Transcript search/filter | Done | Search + confidence filter + “Showing X of Y”; `desktop-transcript.png`. |
| D-19 | Tablet rail labels | Done | `aria-label` on rail items; hover/focus tooltips at 701–900 px. |
| D-20 | Wide-screen camera cap | Done | `.studio` max-width 1560 px and centred; wide layout re-measured. |
| D-21 | Status-bar type scale | Done | 0.6 rem status bar / 0.54 rem group labels; no overflow at 768. |
| D-22 | Mobile short language names | Done | Compact labels at ≤700 px, full name in title/desktop. |
| D-23 | Quick-phrase touch targets | Done | 44 px on mobile. |
| D-24 | Haptic commit feedback | Done | `navigator.vibrate` on commit/practice; Settings toggle. |
| D-25 | Low-power preset | Done | One hand, lite model, ~15 fps; Settings toggle. |
| D-26 | Public model cards | Done (in-product) | `#model-cards` in About: top-1/top-3, split, weakest classes, confusions, review status. A public web dashboard is still future work. |
| D-27 | CSP / security headers | Done | CSP + Permissions-Policy + nosniff + referrer in `netlify.toml` and `serve.mjs`; MediaPipe assets verified under CSP. |
| D-28 | Commit ring / hand constellation | Partly done | Commit animation/pulse + constellation hand glyphs; a true confidence ring is still a design refinement. |
| D-29 | Gliptic Typography | Partly done | Learn → Type to handshape, A–Z glyph strip, labelled experimental; orientation/motion/location and Deaf review missing. |
| D-30 | Reviewer badges / versioned profiles | Partly done | `review` metadata on every profile; model cards show status/version/0 reviewers. Real names require consent. |
| P3 | Continuous KSL recognition | Scaffolded | `src/lib/segmentation.js` + `docs/CONTINUOUS-SIGNING.md`; no trained continuous model yet. |
| P3 | Community profile authoring | Scaffolded | `src/data/profileSchema.js` + `docs/COMMUNITY-PROFILES.md`; no authoring UI yet. |
| P3 | Kiosk mode | Done | `#kiosk-exit`, `?kiosk=1`, Settings → Workspace; hides app chrome. |
| Design | Integrate the supplied lilac/cream, thick-outline, playful hand references | Done | **Studio** theme default; Midnight/Daylight retained; hand glyphs, sticker cards, pill actions, onboarding/practice restyled. |
| P3 | Offline ASR model | Research | Browser ASR remains network-dependent; a bundled Whisper/Vosk-class model is not shipped. |
| P3 | Deaf-led validation | Requires humans | `docs/DEAF-REVIEW-KIT.md`; all profiles remain `pending`. |
| P3 | Real-device thermal testing | Requires devices | `docs/DEVICE-TEST-MATRIX.md`; not executed. |
| P3 | Screen-reader validation | Requires humans | `docs/SCREEN-READER-TEST.md`; not executed. |

## Re-verified after implementation

- **0 axe violations** across 7 view/theme runs (Studio, Midnight, Daylight, mobile).
- **0 horizontal overflow** at 320, 390, 768, 1024, 1440, 1920.
- **0 controls under 24 px**; **0 controls under 44 px on mobile**.
- **0 console / page errors** in the audit sweep.
- **18/18 Node tests**, **74/74 self-test**, static check passing.
- **Offline reload pass**, demo pass (HELLO committed; next sign in progress).
- **Onboarding, practice, kiosk, transcript filters, type-to-sign, model cards** smoke-tested.

## Still not shipped — say so in any demo

- Continuous sign language translation.
- A trained non-manual/face grammar model.
- A true offline ASR model.
- Deaf-led validation of any profile.
- Real-device thermal/camera/mic results.
- Screen-reader sessions (script prepared, not executed).
- A public web evaluation dashboard (in-product model cards exist).

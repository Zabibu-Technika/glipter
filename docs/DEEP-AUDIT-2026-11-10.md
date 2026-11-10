# Glipter deep audit — recognition, translation, mobile, and two-way conversation

**Date:** 10 November 2026
**Product:** Glipter Studio (Tier 1 MVP · Deaf review pending)
**Scope:** sign detection, phrase/motion coverage, translation quality, mobile camera path, two-way ASR/TTS, offline behaviour, security, and UI architecture
**Prepared for:** Zabibu Technika · Tehillah Kachila

> **Later update:** engineering has moved to the Tier 1 MVP build: rest-pose segmentation, THANK YOU / PLEASE / SORRY motion rules, sign-bank capture/export, and a Tier 1 readiness panel are now in the app. Deaf KSL review is still pending. See [`TIER-1-READINESS.md`](TIER-1-READINESS.md).

---

## 1. Executive verdict

Glipter was honest and well-engineered, but it was **a fingerspelling demonstrator with a four-word KSL pilot**, not a conversation engine. The audit found three hard causes for the behaviour you saw:

1. **No phrase or motion vocabulary.** The bundled models only knew 26 static ASL letters and four isolated KSL glosses (`FATHER`, `HELLO`, `IS`, `MY`). “I love you” is the ASL ILY handshape; there was no ILY rule. J and Z are motion letters; the static model approximated them. There was no trajectory recogniser.
2. **The demo repeated because it looped its frame buffer** and appended into the same accumulator. That was fixed in the previous pass; this audit found the deeper coverage gap behind it.
3. **Mobile detection depended on the legacy WebGL-only Hands solution at full camera resolution.** There was no CPU delegate fallback, no WebGL capability check, no downscaled capture, and no mobile safety mode. Rendering was already Canvas 2D, not OpenGL.

The current build is materially better, but it is still **not a validated conversation translator**. The new phrase layer is rule-based and needs Deaf-led review.

---

## 2. What the engine can and cannot do

### Can do now

| Capability | Detail | Confidence / evidence |
|---|---|---|
| ASL static alphabet A–Z | Bundled MLP trained on 10,508 ASL landmark samples | 99.9% top-1 on 2,136 same-corpus held-out frames; **not signer-independent** |
| KSL static fingerspelling | ASL-derived handshape proxy + KSL text reordering | No KSL-specific handshape corpus; documented proxy |
| KSL word pilot | `FATHER`, `HELLO`, `IS`, `MY` | 99.2% top-1 on 124 held-out sequences; **not signer-independent** |
| BSL rules | A, B, L, V two-handed rules | No BSL benchmark; experimental |
| ILY phrase | Thumb + index + pinky extended | Rule-based, high-precision gate; no benchmark |
| HELP phrase | Fist on an open palm | Rule-based two-hand gate; no benchmark |
| J / Z motion | Pinky-J and index-Z trajectory rules | Rule-based; no benchmark; deliberately conservative |
| HELLO wave / YES nod | Open-hand lateral reversals / fist vertical reversals | Rule-based; no benchmark |
| Conversation thread | Signed English + spoken replies + speech-to-sign preview | UI + event plumbing verified in Playwright |
| Embedded TTS | eSpeak NG WASM, offline, no OS voice | Swahili 2.38 s, Amharic 2.02 s, English 2.05 s rendered in-browser |
| Sign → speech | Accumulated English is spoken by the embedded voice | Verified through `speak` path and TTS synthesis |
| Speech → sign | ASR / typed / quick phrase → phrase card or fingerspelling strip | Verified in Talk thread and preview |
| Offline shell | Service worker precaches models, tasks WASM, TTS data, shim | `npm run check`: no runtime CDN loads |

### Cannot do yet

- Continuous signing or sentence-level sign grammar.
- Facial grammar, mouthing, eyebrow/head movements, body location, and non-manual signals.
- KSL lexical coverage beyond four words plus the ASL-derived phrase layer.
- Signer-independent validation. Every accuracy figure is same-corpus held-out, not a new signer.
- Automatic THANK YOU / PLEASE / SORRY / STOP phrase detection. These are available in the phrase board and speech-to-sign preview, but are **not** claimed as automatic recognition.
- A fully OpenGL-free hand detector. MediaPipe Tasks’ WASM graph still uses a GL context for its image-to-tensor stage. Glipter now falls back from WebGL 2 to WebGL 1, offers a CPU delegate, downscales frames, and degrades explicitly to the demo/phrase board when no GL context exists. A GL-free detector would require a different model runtime.

---

## 3. Accuracy: what the numbers mean

| Layer | Metric | What it does **not** prove |
|---|---|---|
| ASL static | 99.9% top-1, 2,136 test frames | Same dataset, grouped frame split; not new signers, lighting, skin tones, camera angles, or Deaf review |
| KSL words | 99.2% top-1, 124 test sequences | Four classes, small corpus, not a lexicon, no facial grammar |
| End-to-end live recognition | Not measured | Segmentation, framing, motion, hand occlusion, and user variation can reduce it materially |
| Phrase/motion rules | No benchmark | Rules are precision-first and only cover a handful of gestures |
| TTS | Signal-level smoke tests only | No intelligibility study, no Swahili/Amharic native-speaker review |

**Answer to “how accurate is our engine?”** The bundled models are highly accurate on their own held-out corpora, but that is not conversational accuracy. The honest statement is: *high same-corpus fingerspelling accuracy; unmeasured end-to-end conversation accuracy; new phrase and motion rules are unvalidated.*

---

## 4. Changes shipped in this pass

### 4.1 Modern hand detection with a CPU path

- Replaced the legacy `@mediapipe/hands` WebGL-only solution with `@mediapipe/tasks-vision` + `HandLandmarker` float16.
- GPU delegate first, CPU/WASM delegate fallback.
- WebGL 2 → WebGL 1 capability check; explicit `no WebGL` message and demo/phrase-board fallback.
- Downscaled capture (640 px mobile, 960 px desktop, 480 px low-power) before inference.
- Canvas 2D overlay; no OpenGL rendering path in the app.
- Busy-guarded inference loop with frame skipping and a 8-second no-frame timeout.
- Camera constraints target mobile-friendly 640×480 and 15 fps in low-power mode.

### 4.2 Phrase and motion layer

New `src/lib/phraseRecognizer.js`:

- **ILY** static handshape → “I love you”.
- **HELP** static two-hand configuration.
- **J** pinky trajectory, **Z** index trajectory.
- **HELLO** open-hand wave, **YES** fist nod.
- Motion attempts suppress the starting static letter so a J attempt is not committed as I, and a Z attempt is not committed as Z twice.
- Phrase IDs map to English in `src/text/phrases.js` and `src/text/grammar.js`.

### 4.3 Translation and conversation

- Phrase-level English mapping: `ILY → I love you`, `HELLO → Hello`, `THANK-YOU → Thank you`, etc.
- Two-way **Talk thread** in the primary Live view:
  - signed English bubbles,
  - spoken/typed reply bubbles,
  - speech-to-sign preview: phrase card for ILY/HELLO/HELP and fingerspelling glyphs for arbitrary text.
- Quick phrase board works without ASR.
- Auto-speak toggle bound to the embedded voice.
- Mobile-first order: camera → Talk thread → inspector → timeline.
- Desktop order: camera + Talk thread in the main column, inspector on the right.

### 4.4 Embedded voice, including African languages

- `vendor/tts/espeak/espeak-ng.js` + `espeak-ng.data`: eSpeak NG compiled to WebAssembly, bundled locally.
- Languages: English, **Kiswahili**, **Afrikaans**, **Amharic**, **Setswana**, **Oromo**, **Tigrinya**, and 100+ more voices in the engine.
- Audio is rendered to PCM in the browser and played through Web Audio. No `speechSynthesis`, no OS voice, no network.
- System voices remain optional, not required.
- Measured in the browser: Swahili 52,541 samples, 2.38 s; Amharic 44,557 samples, 2.02 s; English 45,260 samples, 2.05 s at 22,050 Hz.
- **Licensing:** eSpeak NG is GPL-3.0. The component is isolated in `vendor/tts/espeak/` with its `COPYING` file. A redistributed build that includes it must comply with GPL-3.0. Remove that folder and the `espeak` engine to produce an MIT-only build.

### 4.5 Recognition quality gates

- Added a **decision margin** setting (default 0.08): ambiguous top-1/top-2 frames do not commit.
- Added a minimum hand-size gate to the phrase layer.
- Kept sliding-window debouncing and mirror test-time augmentation.
- Kept the commit-confidence threshold configurable.

---

## 5. Verification performed

| Check | Result |
|---|---|
| Node tests | **22/22** |
| In-app self-test | **77/77** |
| Static checker | **273 IDs, 54 precache references, 0 runtime CDN loads** |
| Demo | `Hello my name is Glipter`, 5 timeline signs, stops and stays stopped |
| Talk quick phrase | “I love you” → spoken bubble + ILY sign card |
| Talk typed reply | “Thank you” → spoken bubble + sign preview |
| Talk layout | No horizontal overflow at 390 px; desktop camera + Talk + inspector columns verified |
| Embedded TTS | Swahili/Amharic/English synthesis in-browser; no console errors |
| Camera path | Initialises HandLandmarker, selects CPU/WebGL backend, reports no-WebGL fallback where the test host has no GL |
| Offline | Service worker cache includes tasks WASM/model and eSpeak JS/data |

**Not performed:** physical Android/iOS device camera, thermal/battery testing, Deaf-led accuracy session, native-speaker TTS intelligibility review, screen-reader pass on the new Talk thread.

---

## 6. Remaining risks and next gates

1. **Deaf-led validation.** The phrase/motion layer is ASL-derived; KSL meanings and variants need native Deaf KSL review before real use.
2. **Real-device camera test.** The test host has no WebGL context, so the camera path could only be verified for initialisation and graceful failure. Test Android Chrome and iOS Safari on hardware.
3. **Continuous signing.** The current model is isolated signs + fingerspelling. A continuous recogniser needs segmentation, motion, and a language model.
4. **Non-manual grammar.** Facial and mouthing features are required for real KSL/ASL grammar.
5. **TTS quality.** eSpeak is clear but robotic; native-speaker review and a neural voice are future work.
6. **Licensing.** eSpeak NG is GPL-3.0. Keep the notice and source offer, or isolate/remove it for a permissive-only build.
7. **Bundle size.** Offline assets are now roughly 47 MB (MediaPipe tasks ~22 MB + eSpeak ~25 MB). That is the cost of embedded detection and multilingual TTS. The app caches them once; low-storage devices should use the demo/phrase board.

---

## 7. Evidence files

- `docs/audit/simple-mobile.png` — final mobile Talk layout with camera, thread, and language button.
- `docs/audit/desktop-live.png` — desktop camera + thread split.
- `docs/audit/desktop-details.png` — the Details drawer with diagnostics.
- `docs/audit/language-dialog-mobile.png` — one-screen language picker.
- `docs/audit/demo-complete.png` — complete demo sentence.
- `docs/DESIGN-AUDIT.md` — earlier visual/accessibility audit.
- `docs/DESIGN-PRINCIPLES.md` — design contract.

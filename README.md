# Glipter Studio

**Edge sign language engine — offline-first, on-device, no backend.**

Glipter turns any camera into a two-way sign language conversation surface. It reads hand landmarks locally, classifies static handshapes, motion letters, and short signed phrases with bundled models and rule layers, then streams the result into gloss and readable English. The hearing side can reply by voice, typing, or a quick phrase; the reply is spoken by an embedded voice and shown back as a sign card or fingerspelling strip.

A **Zabibu Technika** product, led by **Tehillah Kachila**. **Tier 1 MVP · Deaf review pending** — engineering is ready for a Deaf-led pilot; it is not a validated accessibility tool and not a substitute for a professional interpreter.

**Live:** [glipter.vercel.app](https://glipter.vercel.app)

---

## What ships

### App shell

- **Three zones, one screen:** camera (hero), one conversation thread, and controls. Technical diagnostics live in a **Details** drawer; the old separate Translation panel is gone from Talk.
- **Two-way conversation thread:** signed and spoken/typed replies share one messaging thread, each with a small language chip; signed English also appears in a floating live caption.
- **Calm feedback:** a thin camera status ring (idle → hand found → committing → committed), haptic commit, and dotted-underline correction for low-confidence words.
- **Modes for real use:** **Present** widens the thread for a hearing partner; **Face-to-face** rotates it on tablet portrait; phone conversation has peek / half / full heights.
- **Task-first flow:** one primary action per state; advanced camera controls live in the overflow menu.
- **Progressive disclosure:** confidence, top-3, gloss, stats, backend, and model notes are in the Details drawer or About; the main screen stays clean.
- **Light** theme (default): calm neutral surfaces, one blue accent, soft borders. **Studio** (lilac/sticker), **Midnight**, and **System** remain available.
- Dense keyboard workflow: `1–3` primary views, `4` Voice, `5` About, `S` start/stop, `D` demo, `M` mic, `T` speak, `C` clear, `E` export, `⌘K` / `Ctrl+K` commands.
- **Scripted demo that actually finishes:** signs `HELLO MY NAME IS GLIPTER` once, commits all five words, stops at the end of the sentence, and clears the session on replay.
- Responsive: mobile order is camera → conversation; tablet/desktop use a camera + thread split. Tested at 320–1920 px.
- High contrast, large text, reduced motion, print styles.
- Accessible focus states, ARIA live regions for recognized signs and transcripts, skip link, labelled controls.

### Recognition

- **ASL static alphabet (A–Z)** trained on 10,508 real hand-landmark samples. Held-out top-1: **99.9%** (same-corpus, not signer-independent).
- **KSL word signs (pilot)** trained on the official KSL landmark split: `FATHER`, `HELLO`, `IS`, `MY`. Held-out top-1: **99.2%** across 124 sequences.
- **KSL fingerspelling** uses the ASL handshape model as a documented proxy, with KSL text reordering.
- **BSL two-handed fingerspelling** remains rule-based and experimental (A, B, L, V). No permissively licensed BSL landmark corpus is bundled yet.
- **Phrase layer (ASL-derived, experimental):** ILY → “I love you”, HELP, HELLO wave, YES nod, THANK YOU, PLEASE, SORRY, and motion letters J and Z. The motion layer suppresses the starting static letter so a J attempt is not committed as I.
- **Rest-pose segmentation:** a hand starts a segment; six empty frames end it; the boundary closes the current word. The Details drawer shows the live `sign` / `rest` state.
- **Decision margin:** ambiguous top-1/top-2 frames are shown but not committed; threshold and margin are configurable.
- Angle-based finger detection, sliding-window debouncing, top-3 candidates, confidence threshold.
- Live hand skeleton overlay on Canvas 2D, FPS and inference latency telemetry.

### Sign bank and review

- **Capture last two seconds:** landmark-only frames from the live camera or demo, with gloss, language, English, notes, and explicit consent.
- Captures are stored locally and exported as unreviewed `glipter.signbank/1` JSON. No video, no signer names, no reviewer sign-off.
- About shows engineering readiness and the human gate separately: `8 / 8`, `0 / 50` reviewed KSL signs, `0 / 20` Deaf KSL reviewers.
- The current gate and next steps are in [`docs/TIER-1-READINESS.md`](docs/TIER-1-READINESS.md); the review protocol is [`docs/DEAF-REVIEW-KIT.md`](docs/DEAF-REVIEW-KIT.md).

### Voice bridge (ASR + TTS)

> Strategic context: `docs/EDGE-COMPETITOR.md` lays out what it would take to become a true local/edge competitor to cloud-avatar products — data, continuous signing, runtime budget, Deaf-led validation, and distribution.

- **Listen** — browser `SpeechRecognition` with interim results, continuous mode, auto-restart, and spoken-language options for English, Kiswahili, Afrikaans, Amharic, Setswana, Oromo, and Tigrinya. Browser support varies by language; the UI says so. Glipter itself does not upload audio.
- **Speak** — **embedded eSpeak NG WebAssembly**, bundled with the app. It needs no OS voice and no network. Languages include English, **Kiswahili**, **Afrikaans**, **Amharic**, **Setswana**, **Oromo**, and **Tigrinya**.
- **System voice** is an optional fallback, not a requirement.
- **Two-way Talk** — signed English can be spoken automatically; spoken/typed replies appear in the thread and are rendered as a sign card or fingerspelling strip. Signed English is mapped through a **small offline phrase pack** (Hello, Thank you, Please, Yes, No, I love you, Help, Sorry, the demo sentence, and KSL pilot words) before it is spoken; unusual sentences stay in English.
- Optional automatic speech of recognized English in Settings.
- Text fallback works fully offline when ASR is unavailable.

### Learning, onboarding, and kiosk

- Three-step first-run onboarding, replayable from Settings.
- Per-letter handshape hints and a “watch → try → feedback” practice loop.
- **Gliptic Typography (experimental)** — type a word and see the bundled ASL/KSL handshape glyphs.
- Kiosk mode (`?kiosk=1` or Settings) with app chrome hidden and a large capture surface.
- In-product model cards with top-1/top-3, split, weakest classes, confusions, and review status.
- Transcript search and confidence filters in **History**.
- Low-power preset, haptic commit feedback, commit animation, camera framing guide.

### Offline / PWA

- MediaPipe **Tasks Vision** (`vision_bundle.mjs` + WASM + HandLandmarker model) is **vendored locally** in `vendor/mediapipe/tasks`; no runtime CDN.
- **eSpeak NG** (`espeak-ng.js` + `espeak-ng.data`) is vendored in `vendor/tts/espeak`; no runtime CDN and no OS voice.
- `sw.js` precaches the app shell, models, fixtures, icons, MediaPipe tasks assets, and the embedded voice.
- Installable manifest with 192/512/maskable icons.
- After the first successful load, the app can be relaunched with no network.
- No backend in the recognition path. Camera frames never leave the browser.
- **Size:** the offline cache is about 47 MB (tasks vision ~22 MB + eSpeak ~25 MB). That is the cost of embedded detection and multilingual TTS.

### Evaluation

- 77 on-device checks in six layers: ASL fixtures, KSL fixtures, BSL rules, geometry, model/grammar integrity, and the Tier 1 segmentation/sign-bank pipeline.
- Self-test runs on load and is visible in the status bar and About view.
- Node test suite: 22 tests covering feature shapes, model dimensions, fixture accuracy, debouncer, accumulator, grammar, phrase/motion rules, rest-pose segmentation, sign-bank export, Tier 1 status, spoken-language packs, telemetry, and safe ASR/TTS degradation.
- `npm run check` verifies every referenced element ID and every service-worker precache file.
- A professional design/QA audit lives in [`docs/DESIGN-AUDIT.md`](docs/DESIGN-AUDIT.md), with raw measurements in [`docs/audit/audit-data.json`](docs/audit/audit-data.json) and screenshots in [`docs/audit/`](docs/audit/). It covers mobile/tablet/desktop, WCAG 2.2 AA, axe-core, offline reload, demo, and competitive positioning.
- The recognition/mobile/two-way audit is [`docs/DEEP-AUDIT-2026-11-10.md`](docs/DEEP-AUDIT-2026-11-10.md).
- The everyday-person UX research and redesign is [`docs/UX-REDESIGN-2026-11-10.md`](docs/UX-REDESIGN-2026-11-10.md).
- Design principles and the rules behind the current layout: [`docs/DESIGN-PRINCIPLES.md`](docs/DESIGN-PRINCIPLES.md).
- Execution status: [`docs/RECOMMENDATIONS-STATUS.md`](docs/RECOMMENDATIONS-STATUS.md).
- Release gates and human work: [`docs/TIER-1-READINESS.md`](docs/TIER-1-READINESS.md), [`docs/DEAF-REVIEW-KIT.md`](docs/DEAF-REVIEW-KIT.md), [`docs/SCREEN-READER-TEST.md`](docs/SCREEN-READER-TEST.md), [`docs/DEVICE-TEST-MATRIX.md`](docs/DEVICE-TEST-MATRIX.md).
- Architecture/design notes: [`docs/CONTINUOUS-SIGNING.md`](docs/CONTINUOUS-SIGNING.md), [`docs/COMMUNITY-PROFILES.md`](docs/COMMUNITY-PROFILES.md), [`docs/GLIPTIC-TYPOGRAPHY.md`](docs/GLIPTIC-TYPOGRAPHY.md).

### Re-run the audit

```bash
npm run serve                 # in one terminal
npm install                   # installs axe-core + Playwright package
npx playwright install chromium
npm run audit
```

---

## Run it

```bash
cd glipter
npm run serve
```

Open **http://localhost:3000**. Camera access requires localhost or HTTPS; `file://` will not work for the camera. The UI, demo, learn library, self-test, and voice text fallback work without a camera.

### Deploy

Static hosting is all that is required. The production site is **https://glipter.vercel.app**.

- **Vercel:** `vercel --prod` from the project root. `vercel.json` sets the security headers, service-worker cache policy, and MediaPipe asset caching; `.vercelignore` excludes datasets, docs, scripts, and tests from the deployment.
- **Netlify:** `netlify.toml` is included. Netlify Drop works if you zip the whole folder (keep `src/`, `vendor/`, `assets/`, `sw.js`).
- GitHub Pages, Cloudflare Pages, or any static host over HTTPS also work.

---

## Tests

```bash
npm test
npm run check
```

`npm test` uses Node's built-in test runner. `npm run check` is a static audit for missing IDs, missing precache files, and accidental runtime CDN loads.

---

## Retrain the models

Raw datasets are included in `datasets/raw/` with SHA-256 hashes in `datasets/MANIFEST.json`. If they are missing, download and verify them with:

```bash
npm run fetch:datasets
```

Then retrain:

```bash
python scripts/train_asl.py
python scripts/train_ksl_words.py
node scripts/build-sw.mjs
```

The scripts require NumPy. They export:

- `src/data/models/asl-static.js`
- `src/data/models/ksl-words.js`
- `src/data/prototypes.js`
- `src/selftest/fixtures/asl.js`
- `src/selftest/fixtures/ksl-words.js`

The browser runtime is plain JavaScript: no ONNX, no TensorFlow.js, no GPU, no server.

**Feature contract:** the Python feature order and `src/lib/features.js` must stay identical. If you change one, retrain all models.

Dataset acquisition notes are in `datasets/README.md`. BSL data is intentionally not bundled; see `ATTRIBUTION.md` for why.

---

## Structure

```
index.html                 app shell
manifest.webmanifest       PWA metadata
sw.js                      generated service worker (npm run build:sw)
assets/                    app icons, favicon
vendor/mediapipe/tasks/    MediaPipe Tasks Vision + HandLandmarker, Apache-2.0
vendor/tts/espeak/         eSpeak NG WASM multilingual voice, GPL-3.0
datasets/                  manifests + raw reproducible datasets
scripts/                   training, static server, SW builder, checks
src/
  main.js                  application orchestration
  styles.css               app design system
  asr.js                   SpeechRecognition wrapper
  speech.js                embedded TTS + optional system voice
  pwa.js                   service worker + install prompt
  settings.js              persisted preferences
  telemetry.js             transcript + TXT/CSV/JSON export
  ui.js                    panels, hand SVG, self-test rendering, toasts
  engine/engine.js         camera + Tasks Vision + busy-guarded loop
  engine/demo.js           camera-free landmark demo player
  lib/landmarks.js         constants + math
  lib/fingers.js           angle-based finger extension
  lib/features.js          deterministic feature extraction
  lib/model.js             tiny MLP inference runtime
  lib/debouncer.js         sliding-window voting
  lib/overlay.js           mirrored Canvas 2D skeleton renderer
  lib/phraseRecognizer.js  ILY/HELP/J/Z/wave/nod rules
  tts/espeak.js            embedded multilingual TTS
  text/spokenLanguages.js  spoken languages, ASR codes, quick phrases
  languages/               ASL, KSL, KSL words, BSL profiles
  text/accumulator.js      letter runs, word gaps, transcript
  text/grammar.js          ASL/KSL/BSL surface reordering
  text/phrases.js          phrase vocabulary + speech-to-sign map
  data/models/             bundled trained models
  data/prototypes.js       real medoid handshapes for Learn
  selftest/                goldens, fixtures, runner
tests/                     Node test suite
docs/DEEP-AUDIT-2026-11-10.md  recognition/mobile/two-way audit
docs/EDGE-COMPETITOR.md    what it takes to compete at the edge
```

---

## Honest limitations

- Static handshapes drive most of ASL/KSL recognition. J and Z now have motion rules, but the rest of the alphabet is static.
- The KSL word model knows four glosses. It is not a conversation system and not a KSL lexicon.
- The ILY/HELP/J/Z/HELLO/YES phrase layer is **ASL-derived and rule-based**, not a trained or Deaf-reviewed KSL lexicon. Treat it as experimental.
- BSL is rule-based, two-handed, and experimental.
- No facial grammar, mouthing, or non-manual signals — all of which are part of real sign languages.
- Dataset accuracy is held-out from the same public corpora, **not signer-independent validation**.
- **No language profile has been reviewed by native Deaf signers yet.** That review is the gate before any real-world deployment.
- Browser ASR may use an online service. The embedded eSpeak voice does not. System voices are optional and may depend on the OS.
- Spoken translation uses a small offline phrase pack, not a general translator; unusual sentences remain in English.
- MediaPipe's WASM graph still needs a WebGL context for image conversion. Glipter now uses WebGL 1/2 where available, offers a CPU delegate, downscales frames, and falls back to the demo/phrase board when no GL context exists.
- eSpeak NG is **GPL-3.0**; see the licensing note in `ATTRIBUTION.md`. Remove `vendor/tts/espeak/` for an MIT-only build.
- Not for medical, legal, or high-stakes use.

---

## Credits

**Product lead / research / engineering:** Tehillah Kachila
**Product studio / design / engineering:** Zabibu Technika

Datasets: Boris Graudt (ASL, CC0-1.0), Joan Wachuka (KSL, Apache-2.0), Alif Sathar (BSL, Apache-2.0, reference), Google MediaPipe (Apache-2.0), eKitabu and MARS-KSL (reference only).
Embedded voice: eSpeak NG (GPL-3.0). MediaPipe Tasks Vision and HandLandmarker (Apache-2.0).

See `CREDITS.md`, `ATTRIBUTION.md`, and `datasets/MANIFEST.json` for details.

## License

Code: MIT. Data and model artifacts: upstream licenses, documented in `ATTRIBUTION.md`.
The bundled eSpeak NG voice is GPL-3.0; redistributed builds that include it must comply with GPL-3.0.

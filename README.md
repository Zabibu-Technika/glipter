# Glipter Studio

**Edge sign language engine — offline-first, on-device, no backend.**

Glipter turns any camera into a sign language interface. It reads hand landmarks locally, classifies static handshapes or short word sequences with small bundled neural networks, and streams the result into a gloss line and readable English. It also includes a two-way **Voice** bridge: browser ASR for speech → text, and device TTS for text → speech.

A **Zabibu Technika** product, led by **Tehillah Kachila**. Tier 0 demonstrator — not a validated accessibility tool, not a substitute for a professional interpreter.

**Live:** [glipter.vercel.app](https://glipter.vercel.app)

---

## What ships

### App shell

- Native-app-style layout: app bar, rail navigation, split-pane studio, inspector, timeline, status bar, command palette.
- **Task-first Live flow:** one primary action per state (Start in the empty state, Stop when running); advanced controls live in the camera overflow menu.
- **Progressive disclosure:** the inspector leads with the sign, confidence, state, and English; gloss, top-3, stats, and model notes live under **Details**.
- **Studio** theme (default): lilac/cream surfaces, deep ink outlines, sticker cards, green/purple hand glyphs. **Midnight** and **Daylight** are included, plus system.
- Dense keyboard workflow: `1–5` views, `S` start/stop, `D` demo, `M` mic, `T` speak, `C` clear, `E` export, `⌘K` / `Ctrl+K` commands.
- **Scripted demo that actually finishes:** signs `HELLO MY NAME IS GLIPTER` once, commits all five words, stops at the end of the sentence, and clears the session on replay.
- Responsive: rail on desktop/tablet; bottom tab bar on phones; tested at 320–1920 px.
- High contrast, large text, reduced motion, print styles.
- Accessible focus states, ARIA live regions for recognized signs and transcripts, skip link, labelled controls.

### Recognition

- **ASL static alphabet (A–Z)** trained on 10,508 real MediaPipe hand-landmark samples. Held-out top-1: **99.9%** (same-corpus, not signer-independent).
- **KSL word signs (pilot)** trained on the official KSL landmark split: `FATHER`, `HELLO`, `IS`, `MY`. Held-out top-1: **99.2%** across 124 sequences.
- **KSL fingerspelling** uses the ASL handshape model as a documented proxy, with KSL text reordering.
- **BSL two-handed fingerspelling** remains rule-based and experimental (A, B, L, V). No permissively licensed BSL landmark corpus is bundled yet.
- Angle-based finger detection, sliding-window debouncing, top-3 candidates, confidence threshold.
- Live hand skeleton overlay, FPS and inference latency telemetry.

### Voice bridge (ASR + TTS)

> Strategic context: `docs/EDGE-COMPETITOR.md` lays out what it would take to become a true local/edge competitor to cloud-avatar products — data, continuous signing, runtime budget, Deaf-led validation, and distribution.

- **Listen** — browser `SpeechRecognition` with interim results, continuous mode, auto-restart, four language options (English US/UK/Kenya, Kiswahili Kenya). It is labelled honestly: browser ASR may use an online service; Glipter itself does not upload audio.
- **Speak** — `SpeechSynthesis` with local-first voice selection, rate control, quick phrases, copy, and stop.
- **Speak current English** from the recognition inspector.
- Optional automatic speech of recognized English in Settings.
- Text fallback works fully offline when ASR is unavailable.

### Learning, onboarding, and kiosk

- Three-step first-run onboarding, replayable from Settings.
- Per-letter handshape hints and a “watch → try → feedback” practice loop.
- **Gliptic Typography (experimental)** — type a word and see the bundled ASL/KSL handshape glyphs.
- Kiosk mode (`?kiosk=1` or Settings) with app chrome hidden and a large capture surface.
- In-product model cards with top-1/top-3, split, weakest classes, confusions, and review status.
- Transcript search and confidence filters.
- Low-power preset, haptic commit feedback, commit animation, camera framing guide.

### Offline / PWA

- MediaPipe Hands (JS + WASM + TFLite models) is **vendored locally** in `vendor/mediapipe/hands`; no runtime CDN.
- `sw.js` precaches the app shell, models, fixtures, icons, and MediaPipe assets.
- Installable manifest with 192/512/maskable icons.
- After the first successful load, the app can be relaunched with no network.
- No backend in the recognition path. Camera frames never leave the browser.

### Evaluation

- 74 on-device checks in five layers: ASL fixtures, KSL fixtures, BSL rules, geometry, model/grammar integrity.
- Self-test runs on load and is visible in the status bar and About view.
- Node test suite: feature shapes, model dimensions, fixture accuracy, debouncer, accumulator, grammar, telemetry, safe ASR/TTS degradation.
- `npm run check` verifies every referenced element ID and every service-worker precache file.
- A professional design/QA audit lives in [`docs/DESIGN-AUDIT.md`](docs/DESIGN-AUDIT.md), with raw measurements in [`docs/audit/audit-data.json`](docs/audit/audit-data.json) and screenshots in [`docs/audit/`](docs/audit/). It covers mobile/tablet/desktop, WCAG 2.2 AA, axe-core, offline reload, demo, and competitive positioning.
- Design principles and the rules behind the current layout: [`docs/DESIGN-PRINCIPLES.md`](docs/DESIGN-PRINCIPLES.md).
- Execution status: [`docs/RECOMMENDATIONS-STATUS.md`](docs/RECOMMENDATIONS-STATUS.md).
- Release gates and human work: [`docs/DEAF-REVIEW-KIT.md`](docs/DEAF-REVIEW-KIT.md), [`docs/SCREEN-READER-TEST.md`](docs/SCREEN-READER-TEST.md), [`docs/DEVICE-TEST-MATRIX.md`](docs/DEVICE-TEST-MATRIX.md).
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
index.html                 app shell + vendored MediaPipe script
manifest.webmanifest       PWA metadata
sw.js                      generated service worker (npm run build:sw)
assets/                    app icons, favicon
vendor/mediapipe/hands/    MediaPipe Hands JS/WASM/TFLite, Apache-2.0
datasets/                  manifests + raw reproducible datasets
scripts/                   training, static server, SW builder, checks
src/
  main.js                  application orchestration
  styles.css               app design system
  asr.js                   SpeechRecognition wrapper
  speech.js                SpeechSynthesis wrapper
  pwa.js                   service worker + install prompt
  settings.js              persisted preferences
  telemetry.js             transcript + TXT/CSV/JSON export
  ui.js                    panels, hand SVG, self-test rendering, toasts
  engine/engine.js         camera + MediaPipe + busy-guarded loop
  engine/demo.js           camera-free landmark demo player
  lib/landmarks.js         constants + math
  lib/fingers.js           angle-based finger extension
  lib/features.js          deterministic feature extraction
  lib/model.js             tiny MLP inference runtime
  lib/debouncer.js         sliding-window voting
  lib/overlay.js           mirrored skeleton renderer
  languages/               ASL, KSL, KSL words, BSL profiles
  text/accumulator.js      letter runs, word gaps, transcript
  text/grammar.js          ASL/KSL/BSL surface reordering
  data/models/             bundled trained models
  data/prototypes.js       real medoid handshapes for Learn
  selftest/                goldens, fixtures, runner
tests/                     Node test suite
docs/EDGE-COMPETITOR.md    what it takes to compete at the edge
```

---

## Honest limitations

- Static handshapes only for ASL/KSL fingerspelling. J and Z are motion letters and are approximate here.
- The KSL word model knows four glosses. It is not a conversation system and not a KSL lexicon.
- BSL is rule-based, two-handed, and experimental.
- No facial grammar, mouthing, or non-manual signals — all of which are part of real sign languages.
- Dataset accuracy is held-out from the same public corpora, **not signer-independent validation**.
- **No language profile has been reviewed by native Deaf signers yet.** That review is the gate before any real-world deployment.
- Browser ASR may use an online service. TTS may use a remote voice if no local voice is installed. The UI says so.
- Not for medical, legal, or high-stakes use.

---

## Credits

**Product lead / research / engineering:** Tehillah Kachila
**Product studio / design / engineering:** Zabibu Technika

Datasets: Boris Graudt (ASL, CC0-1.0), Joan Wachuka (KSL, Apache-2.0), Alif Sathar (BSL, Apache-2.0, reference), Google MediaPipe (Apache-2.0), eKitabu and MARS-KSL (reference only).

See `CREDITS.md`, `ATTRIBUTION.md`, and `datasets/MANIFEST.json` for details.

## License

Code: MIT. Data and model artifacts: upstream licenses, documented in `ATTRIBUTION.md`.

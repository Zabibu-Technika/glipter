# Attribution & licenses

Glipter's **source code** is MIT-licensed (see `LICENSE`). Bundled models, datasets, and runtime assets keep their own licenses. This file is the map.

## Code

| Component | License | Notes |
|---|---|---|
| Glipter application code | MIT | © 2026 Tehillah Kachila and Zabibu Technika |
| `vendor/mediapipe/hands/*` | Apache-2.0 | Google MediaPipe Hands, vendored from `@mediapipe/hands@0.4.1675469240`. Full license in `vendor/mediapipe/LICENSE`. |
| `src/selftest/fixtures/asl.js` | CC0-1.0 (derived) | Held-out landmark samples from the CC0 ASL dataset. |
| `src/data/models/asl-static.js` | CC0-1.0 (derived model) | Trained on the CC0 ASL landmark dataset. |
| `src/selftest/fixtures/ksl-words.js` | Apache-2.0 (derived) | Held-out sequences from the Apache-2.0 KSL landmark dataset. |
| `src/data/models/ksl-words.js` | Apache-2.0 (derived model) | Trained on the Apache-2.0 KSL landmark dataset. |
| `src/data/prototypes.js` | CC0-1.0 (derived) | Medoid handshapes from the CC0 ASL dataset. |

## Data

### ASL Alphabet Hand Landmarks

- **Author:** Boris Graudt
- **License:** CC0-1.0 (public domain dedication)
- **Source:** https://www.kaggle.com/datasets/borisgraudt/asl-alphabet-hand-landmarks
- **Bundled as:** `datasets/raw/asl-borisgraudt.zip`
- **Modifications:** wrist-centred and scale-normalised; 283-dimensional feature vectors; mirror augmentation; grouped train/test split; distilled into a small neural network.
- **Limits:** same-corpus held-out frames, not signer-independent; not reviewed by Deaf ASL signers.

### KSL hand landmarks

- **Author:** Joan Wachuka
- **License:** Apache-2.0
- **Source:** https://www.kaggle.com/datasets/joanwachuka/ksl-hand-landmarks
- **Bundled as:** `datasets/raw/ksl-joanwachuka.zip`
- **Modifications:** two-hand vectors; 24-frame resampling; summary statistics; mirror augmentation; distillation into a four-class sequence model.
- **Limits:** four glosses; small dataset; not signer-independent; not reviewed by Deaf KSL signers.

### BSL-Fingerspelling-Dataset

- **Author:** Alif Sathar
- **License:** Apache-2.0
- **Source:** https://www.kaggle.com/datasets/alifsathar/bsl-fingerspelling-dataset
- **Bundled as:** not bundled.
- **Why:** the images need landmark extraction and Deaf-led review before a BSL model can be claimed. BSL remains rule-based in this build.

### MARS-KSL

- **Source:** https://doi.org/10.5281/zenodo.14974973
- **Bundled as:** not bundled; access-restricted.
- **Use:** reference benchmark only. The published 86.3% frontal accuracy is a useful context number, not a Glipter result.

### eKitabu KSL Video Dataset

- **Author:** eKitabu / Laurette Kazenga
- **License:** CC-BY-NC-4.0
- **Source:** https://www.kaggle.com/datasets/ekitabu/kenyan-sign-language-videos
- **Bundled as:** not bundled.
- **Why:** large, non-commercial, and requires a consent and Deaf-led curation process.

## Runtime APIs

- **Web Speech API (SpeechSynthesis / SpeechRecognition):** browser-provided. Glipter does not upload audio itself. Browser ASR may use the browser vendor's online service; TTS may use a local or remote voice. The UI labels this.
- **MediaPipe Hands:** hand landmarks are computed locally in the browser from the camera stream.

## What "derived model" means

The model files are trained artifacts. They do not contain raw dataset rows. They are distributed so the demo can run offline without shipping the raw corpora. If you redistribute them, keep the upstream license and this attribution with them.

## No endorsement

Dataset authors and Google have not endorsed Glipter. Their names appear here for attribution only.

## Takedown / correction

If you are a rights holder and believe an attribution is incomplete or a use is inappropriate, open an issue in the repository. We will correct or remove the material.

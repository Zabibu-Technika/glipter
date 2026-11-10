# Credits

## Project

**Glipter** — edge sign language engine
**Glipter Studio** — the on-device application shell

**A Zabibu Technika product.**

- **Tehillah Kachila** — product lead · research, product, and engineering
- **Zabibu Technika** — product studio · design, engineering, and delivery

Glipter is a Tier 0 demonstrator. It is not a validated accessibility tool, and it is not a substitute for a professional interpreter.

## Datasets

- **ASL Alphabet Hand Landmarks** — Boris Graudt — CC0-1.0 — [Kaggle](https://www.kaggle.com/datasets/borisgraudt/asl-alphabet-hand-landmarks). Used to train the ASL static alphabet model and the KSL fingerspelling proxy.
- **KSL hand landmarks** — Joan Wachuka — Apache-2.0 — [Kaggle](https://www.kaggle.com/datasets/joanwachuka/ksl-hand-landmarks). Used to train the KSL four-word pilot model.
- **BSL-Fingerspelling-Dataset** — Alif Sathar — Apache-2.0 — [Kaggle](https://www.kaggle.com/datasets/alifsathar/bsl-fingerspelling-dataset). Referenced as the next BSL data source; BSL remains rule-based in this build.
- **MARS-KSL** — KSL research benchmark — [Zenodo](https://doi.org/10.5281/zenodo.14974973). Referenced for context only; the record is access-restricted and is not bundled.
- **Kenyan Sign Language (KSL) Video Dataset** — eKitabu / Laurette Kazenga — CC-BY-NC-4.0 — [Kaggle](https://www.kaggle.com/datasets/ekitabu/kenyan-sign-language-videos). Referenced for future work; not bundled.

## Runtime

- **MediaPipe Tasks Vision / HandLandmarker** — Google — Apache-2.0. Vendored locally in `vendor/mediapipe/tasks`.
- **eSpeak NG** — eSpeak NG contributors — GPL-3.0. Embedded multilingual text-to-speech (English, Kiswahili, Afrikaans, Amharic, Setswana, Oromo, Tigrinya, and more), vendored in `vendor/tts/espeak`.
- **Web Speech API** — optional browser-provided speech recognition and system voices. The app does not upload audio itself; browser ASR may use the browser vendor's service. The embedded eSpeak voice does not use the OS or the network.
- **Inter / system font stack** — the UI uses the operating system's native sans-serif and monospace fonts, so no font files are fetched at runtime.

## Review status

No language profile has been validated by native Deaf signers yet. That review is a non-negotiable gate before any profile is promoted from experimental to production. If you are a Deaf signer and want to review a profile, the repository's issue tracker is the starting point.

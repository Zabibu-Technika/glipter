# Datasets

Raw zips are kept here for reproducibility. The browser never loads them; the app loads the distilled models and small held-out fixtures under `src/data` and `src/selftest/fixtures`.

## Bundled

| File | Dataset | License | Used for |
|---|---|---|---|
| `raw/asl-borisgraudt.zip` | ASL Alphabet Hand Landmarks (Boris Graudt) | CC0-1.0 | ASL alphabet model + KSL fingerspelling proxy |
| `raw/ksl-joanwachuka.zip` | KSL hand landmarks (Joan Wachuka) | Apache-2.0 | KSL four-word pilot |

SHA-256 hashes, sizes, provenance, and limitations are in `MANIFEST.json`.

## Not bundled

- **BSL-Fingerspelling-Dataset** (Alif Sathar, Apache-2.0) — 201 MB of BSL images. It needs landmark extraction and Deaf-led review before a BSL model can be claimed. BSL remains rule-based.
- **MARS-KSL** — the Zenodo record is access-restricted. Referenced as a benchmark only.
- **eKitabu KSL Video Dataset** — 14.6 GB, CC-BY-NC-4.0. Requires consent and community curation; future work.

## Rebuild the distilled artifacts

```bash
python scripts/train_asl.py
python scripts/train_ksl_words.py
node scripts/build-sw.mjs
```

The training scripts read the zips directly. They do not require Kaggle credentials if the zips are already present.

## Download (if the zips are missing)

Kaggle public datasets can be downloaded without a browser session through their API endpoints:

```bash
curl -L -o datasets/raw/asl-borisgraudt.zip \
  https://www.kaggle.com/api/v1/datasets/download/borisgraudt/asl-alphabet-hand-landmarks
curl -L -o datasets/raw/ksl-joanwachuka.zip \
  https://www.kaggle.com/api/v1/datasets/download/joanwachuka/ksl-hand-landmarks
```

If an endpoint changes, download from the dataset page and place the zip at the path above.

## Ethics

The datasets are research artifacts. Glipter's held-out numbers are same-corpus numbers, not signer-independent validation. Every language profile needs review by native Deaf signers before it is used with real people. Do not use this demo in medical, legal, or high-stakes contexts.

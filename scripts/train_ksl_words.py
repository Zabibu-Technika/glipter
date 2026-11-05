"""Train Glipter's KSL word-sign pilot model.

Dataset: "KSL hand landmarks" by Joan Wachuka (Apache-2.0)
         101 sequences described by the publisher; the packaged split contains
         818 sequences across four glosses: father, hello, is, my.
Source:  https://www.kaggle.com/datasets/joanwachuka/ksl-hand-landmarks
Raw zip: datasets/raw/ksl-joanwachuka.zip (sha256 in datasets/MANIFEST.json)

Run:
    python scripts/train_ksl_words.py
"""

from __future__ import annotations

import io
import os
import zipfile

import numpy as np

from glipter_ml import (
    sequence_summary,
    two_hand_features,
    train_mlp,
    predict_proba,
    write_js_module,
    round_list,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(ROOT, "datasets", "raw", "ksl-joanwachuka.zip")
MODEL_OUT = os.path.join(ROOT, "src", "data", "models", "ksl-words.js")
FIXTURES_OUT = os.path.join(ROOT, "src", "selftest", "fixtures", "ksl-words.js")

CLASSES = ["father", "hello", "is", "my"]
LABELS = {"FATHER": "Father", "HELLO": "Hello", "IS": "Is", "MY": "My"}
TARGET_FRAMES = 24


def split_hands(flat: np.ndarray):
    flat = np.asarray(flat).reshape(-1, 126)
    a = flat[:, :63].reshape(-1, 21, 3)
    b = flat[:, 63:].reshape(-1, 21, 3)
    if np.allclose(a, 0):
        a = None
    if np.allclose(b, 0):
        b = None
    return a, b


def frame_features(flat: np.ndarray) -> np.ndarray:
    a, b = split_hands(flat)
    return np.array(
        [
            two_hand_features(
                a[i] if a is not None else None,
                b[i] if b is not None else None,
                pairwise=False,
                angles=False,
            )
            for i in range(len(flat))
        ]
    )


def mirror_flat(flat: np.ndarray) -> np.ndarray:
    out = np.array(flat, copy=True).reshape(-1, 126)
    for start in (0, 63):
        for i in range(start, start + 63, 3):
            out[:, i] *= -1
    return out


def resample_flat(seq: np.ndarray, target: int = TARGET_FRAMES) -> np.ndarray:
    seq = np.asarray(seq).reshape(-1, 126)
    if len(seq) == 1:
        return np.repeat(seq, target, axis=0)
    xs = np.linspace(0, len(seq) - 1, target)
    lo = np.floor(xs).astype(int)
    hi = np.minimum(len(seq) - 1, lo + 1)
    frac = (xs - lo)[:, None]
    return seq[lo] * (1 - frac) + seq[hi] * frac


def load_split(zf: zipfile.ZipFile, split: str):
    sequences, labels = [], []
    for cls in CLASSES:
        prefix = f"data_split/data_split/{split}/{cls}/"
        for name in sorted(zf.namelist()):
            if name.startswith(prefix) and name.endswith(".npy"):
                seq = np.load(io.BytesIO(zf.read(name)), allow_pickle=False)
                sequences.append(resample_flat(seq))
                labels.append(CLASSES.index(cls))
    return sequences, np.array(labels)


def main():
    if not os.path.exists(ZIP_PATH):
        raise SystemExit(
            f"Missing {ZIP_PATH}. Run `node scripts/fetch-datasets.mjs` first."
        )
    with zipfile.ZipFile(ZIP_PATH) as zf:
        train_seqs, y_train = load_split(zf, "train")
        val_seqs, y_val = load_split(zf, "val")
        test_seqs, y_test = load_split(zf, "test")

    print(
        f"Sequences: {len(train_seqs)} train / {len(val_seqs)} val / {len(test_seqs)} test"
    )

    def build(seqs, mirror=False):
        rows = []
        for seq in seqs:
            src = mirror_flat(seq) if mirror else seq
            vectors = frame_features(src)
            rows.append(sequence_summary(vectors, TARGET_FRAMES))
        return np.array(rows)

    x_train = np.concatenate(
        [build(train_seqs), build(train_seqs, mirror=True)], axis=0
    )
    y_train_aug = np.concatenate([y_train, y_train], axis=0)
    x_val = build(val_seqs)
    x_test = build(test_seqs)

    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0) + 1e-8
    x_train_n = (x_train - mean) / std
    x_val_n = (x_val - mean) / std
    x_test_n = (x_test - mean) / std

    result = train_mlp(
        x_train_n,
        y_train_aug,
        x_val_n,
        y_val,
        n_classes=len(CLASSES),
        hidden=64,
        epochs=120,
        lr=2e-3,
        l2=2e-4,
        seed=11,
    )
    proba = predict_proba(result.params, x_test_n)
    pred = proba.argmax(axis=1)
    top1 = float((pred == y_test).mean())
    top3 = float(
        np.mean([y_test[i] in np.argsort(proba[i])[-3:] for i in range(len(y_test))])
    )
    print(f"Best validation: {result.best_acc:.4f}; held-out test: {top1:.4f}")

    per_class = {}
    for i, cls in enumerate(CLASSES):
        mask = y_test == i
        if mask.any():
            per_class[cls.upper()] = round(float((pred[mask] == i).mean()), 4)

    fixtures = []
    for i, cls in enumerate(CLASSES):
        candidates = [
            j for j in range(len(test_seqs)) if y_test[j] == i and pred[j] == i
        ]
        candidates.sort(key=lambda j: float(proba[j][i]), reverse=True)
        chosen = candidates[:1] if candidates else []
        for j in chosen:
            fixtures.append(
                {
                    "className": cls.upper(),
                    "frames": round_list(
                        resample_flat(test_seqs[j], TARGET_FRAMES).tolist(), 6
                    ),
                    "confidence": round(float(proba[j][i]), 4),
                }
            )

    model = {
        "id": "ksl-words-v1",
        "version": "1.0.0",
        "name": "KSL word signs (pilot)",
        "kind": "sequence",
        "classes": [c.upper() for c in CLASSES],
        "labels": LABELS,
        "threshold": 0.5,
        "feature": {
            "kind": "sequence",
            "targetFrames": TARGET_FRAMES,
            "summary": ["mean", "std", "min", "max", "delta", "motion"],
            "mirror": True,
        },
        "twoHandFeature": {
            "kind": "two-hand",
            "normalize": "wrist-max",
            "raw": True,
            "pairwise": False,
            "angles": False,
            "interHand": True,
            "mirror": True,
        },
        "mean": mean.tolist(),
        "std": std.tolist(),
        "layers": [
            {
                "activation": "relu",
                "weights": result.params[0].tolist(),
                "bias": result.params[1].tolist(),
            },
            {
                "activation": "softmax",
                "weights": result.params[2].tolist(),
                "bias": result.params[3].tolist(),
            },
        ],
        "metrics": {
            "top1": round(top1, 4),
            "top3": round(top3, 4),
            "testSamples": int(len(test_seqs)),
            "trainSamples": int(len(train_seqs) * 2),
            "validationSamples": int(len(val_seqs)),
            "split": "official train/validation/test split",
            "note": "Four-word KSL pilot. The packaged dataset is small and not signer-independent. It is not a KSL lexicon and has not been reviewed by Deaf KSL signers.",
        },
        "perClass": per_class,
        "dataset": {
            "name": "KSL hand landmarks",
            "author": "Joan Wachuka",
            "license": "Apache-2.0",
            "source": "https://www.kaggle.com/datasets/joanwachuka/ksl-hand-landmarks",
            "samples": 818,
            "classes": 4,
            "words": ["FATHER", "HELLO", "IS", "MY"],
            "preprocessing": "MediaPipe Hands; two hands; wrist-centered and scale-normalized",
        },
    }

    write_js_module(MODEL_OUT, "KSL_WORDS_MODEL", model)
    write_js_module(FIXTURES_OUT, "KSL_WORDS_FIXTURES", fixtures)

    print(f"Wrote {MODEL_OUT}")
    print(f"Wrote {FIXTURES_OUT} ({len(fixtures)} fixtures)")
    print("Per class:", per_class)


if __name__ == "__main__":
    main()

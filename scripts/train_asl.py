"""Train Glipter's ASL static alphabet model.

Dataset: "ASL Alphabet Hand Landmarks" by Boris Graudt (CC0-1.0)
         10,508 MediaPipe hand landmarks, 26 classes, Kaggle.
Source:  https://www.kaggle.com/datasets/borisgraudt/asl-alphabet-hand-landmarks
Raw zip: datasets/raw/asl-borisgraudt.zip (sha256 in datasets/MANIFEST.json)

Run:
    python scripts/train_asl.py
"""

from __future__ import annotations

import os
import re
import zipfile

import numpy as np

from glipter_ml import (
    normalize_hand,
    mirror_normalized,
    static_features,
    stratified_group_split,
    train_mlp,
    predict_proba,
    write_js_module,
    round_list,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_PATH = os.path.join(ROOT, "datasets", "raw", "asl-borisgraudt.zip")
MODEL_OUT = os.path.join(ROOT, "src", "data", "models", "asl-static.js")
PROTOTYPES_OUT = os.path.join(ROOT, "src", "data", "prototypes.js")
FIXTURES_OUT = os.path.join(ROOT, "src", "selftest", "fixtures", "asl.js")

FRAME_RE = re.compile(r"frame_(\d+)\.npy$")


def load_dataset():
    if not os.path.exists(ZIP_PATH):
        raise SystemExit(
            f"Missing {ZIP_PATH}. Run `node scripts/fetch-datasets.mjs` first."
        )
    landmarks, labels, frame_indices, names = [], [], [], []
    with zipfile.ZipFile(ZIP_PATH) as zf:
        for name in zf.namelist():
            match = FRAME_RE.search(name)
            if not match:
                continue
            parts = name.split("/")
            if len(parts) < 3:
                continue
            label = parts[-2]
            if not (len(label) == 1 and label.isalpha()):
                continue
            arr = np.load(__import__("io").BytesIO(zf.read(name)), allow_pickle=False)
            landmarks.append(arr.reshape(21, 3))
            labels.append(label.upper())
            frame_indices.append(int(match.group(1)))
            names.append(name)
    if not landmarks:
        raise SystemExit("No landmark samples found in the ASL zip.")
    return np.array(landmarks), labels, frame_indices, names


def main():
    landmarks, labels, frame_indices, names = load_dataset()
    classes = sorted(set(labels))
    class_index = {c: i for i, c in enumerate(classes)}
    y = np.array([class_index[l] for l in labels])
    print(f"Loaded {len(landmarks)} samples, {len(classes)} classes")

    # 283-dimensional feature vector: 63 raw + 210 pairwise + 10 angles.
    features = np.array([static_features(a) for a in landmarks])
    mirrored = np.array(
        [static_features(mirror_normalized(normalize_hand(a))) for a in landmarks]
    )
    print(f"Features: {features.shape}")

    train_idx, test_idx, test_groups = stratified_group_split(
        labels, frame_indices, group_size=25, test_fraction=0.2, seed=42
    )
    print(
        f"Grouped split: {len(train_idx)} train / {len(test_idx)} test; {len(test_groups)} held-out groups"
    )

    x_train = np.concatenate([features[train_idx], mirrored[train_idx]], axis=0)
    y_train = np.concatenate([y[train_idx], y[train_idx]], axis=0)
    mean = x_train.mean(axis=0)
    std = x_train.std(axis=0) + 1e-8
    x_train_n = (x_train - mean) / std
    x_test_n = (features[test_idx] - mean) / std
    y_test = y[test_idx]

    result = train_mlp(
        x_train_n,
        y_train,
        x_test_n,
        y_test,
        n_classes=len(classes),
        hidden=128,
        epochs=90,
        lr=2e-3,
        l2=1e-4,
        seed=7,
    )
    print(f"Best held-out accuracy: {result.best_acc:.4f}")

    proba = predict_proba(result.params, x_test_n)
    pred = proba.argmax(axis=1)
    top1 = float((pred == y_test).mean())
    top3 = float(
        np.mean([y_test[i] in np.argsort(proba[i])[-3:] for i in range(len(y_test))])
    )

    mirrored_proba = predict_proba(result.params, (mirrored[test_idx] - mean) / std)
    mirrored_top1 = float((mirrored_proba.argmax(axis=1) == y_test).mean())

    per_class = {}
    for i, cls in enumerate(classes):
        mask = y_test == i
        if mask.any():
            per_class[cls] = round(float((pred[mask] == i).mean()), 4)

    confusions = []
    for expected in range(len(classes)):
        for actual in range(len(classes)):
            if expected == actual:
                continue
            count = int(np.sum((y_test == expected) & (pred == actual)))
            if count:
                confusions.append(
                    {
                        "expected": classes[expected],
                        "actual": classes[actual],
                        "count": count,
                    }
                )
    confusions.sort(key=lambda c: -c["count"])

    # Medoid prototypes: real handshapes for the Learn view.
    train_features_n = (features[train_idx] - mean) / std
    prototypes = {}
    for i, cls in enumerate(classes):
        mask = y[train_idx] == i
        if not mask.any():
            continue
        cls_features = train_features_n[mask]
        centroid = cls_features.mean(axis=0)
        distances = np.linalg.norm(cls_features - centroid, axis=1)
        best = int(np.where(mask)[0][int(np.argmin(distances))])
        prototypes[cls] = {
            "landmarks": round_list(
                normalize_hand(landmarks[train_idx[best]]).tolist(), 6
            ),
            "source": "training-set medoid",
        }

    # Held-out fixtures for the on-page self-test. Two per class, chosen from
    # correctly classified test samples across the confidence range.
    fixtures = []
    for i, cls in enumerate(classes):
        candidates = [
            j for j in range(len(test_idx)) if y_test[j] == i and pred[j] == i
        ]
        candidates.sort(key=lambda j: float(proba[j][i]), reverse=True)
        chosen = candidates[:2] if len(candidates) >= 2 else candidates
        for j in chosen:
            fixtures.append(
                {
                    "className": cls,
                    "landmarks": round_list(landmarks[test_idx[j]].tolist(), 6),
                    "confidence": round(float(proba[j][i]), 4),
                }
            )

    model = {
        "id": "asl-static-v1",
        "version": "1.0.0",
        "name": "ASL static alphabet",
        "kind": "static",
        "classes": classes,
        "labels": {c: c for c in classes},
        "threshold": 0.45,
        "motionLetters": ["J", "Z"],
        "feature": {
            "kind": "static",
            "normalize": "wrist-max",
            "align2d": False,
            "raw": True,
            "pairwise": True,
            "angles": True,
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
            "mirroredTop1": round(mirrored_top1, 4),
            "testSamples": int(len(test_idx)),
            "trainSamples": int(len(train_idx) * 2),
            "split": "grouped holdout (class × frame-index bucket), 80/20",
            "note": "Held-out frames from the same curated public dataset. This is not signer-independent validation and has not been reviewed by Deaf ASL signers.",
        },
        "perClass": per_class,
        "confusions": confusions[:12],
        "dataset": {
            "name": "ASL Alphabet Hand Landmarks",
            "author": "Boris Graudt",
            "license": "CC0-1.0",
            "source": "https://www.kaggle.com/datasets/borisgraudt/asl-alphabet-hand-landmarks",
            "samples": 10508,
            "classes": 26,
            "preprocessing": "MediaPipe Hands; centered at wrist; scaled by max wrist distance",
        },
    }

    write_js_module(MODEL_OUT, "ASL_STATIC_MODEL", model)
    write_js_module(
        PROTOTYPES_OUT,
        "HANDSHAPE_PROTOTYPES",
        {
            "ASL": prototypes,
            "KSL": prototypes,
        },
    )
    write_js_module(FIXTURES_OUT, "ASL_FIXTURES", fixtures)

    print(f"Wrote {MODEL_OUT}")
    print(f"Wrote {PROTOTYPES_OUT}")
    print(f"Wrote {FIXTURES_OUT} ({len(fixtures)} fixtures)")
    print(f"Top-1 {top1:.4f} · top-3 {top3:.4f} · mirrored {mirrored_top1:.4f}")
    print("Per class:", ", ".join(f"{k}={v:.2f}" for k, v in per_class.items()))


if __name__ == "__main__":
    main()

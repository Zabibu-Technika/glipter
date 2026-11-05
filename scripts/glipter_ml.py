"""Shared, dependency-light training helpers for Glipter.

Only numpy is required. The feature order here must stay in lock-step with
src/lib/features.js. If you change one, retrain the models.
"""

from __future__ import annotations

import io
import json
import math
import os
import zipfile
from dataclasses import dataclass
from typing import Iterable

import numpy as np

FINGER_CHAINS = [
    (1, 2, 3, 4),
    (5, 6, 7, 8),
    (9, 10, 11, 12),
    (13, 14, 15, 16),
    (17, 18, 19, 20),
]


def softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def normalize_hand(a: np.ndarray, align2d: bool = False) -> np.ndarray:
    a = np.asarray(a, dtype=np.float64).reshape(21, 3)
    out = a - a[0]
    if align2d:
        angle = math.atan2(out[9, 1], out[9, 0]) + math.pi / 2
        c, s = math.cos(angle), math.sin(angle)
        rot = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        out = out @ rot.T
    scale = float(np.linalg.norm(out, axis=1).max())
    if scale > 1e-9:
        out = out / scale
    return out


def mirror_normalized(a: np.ndarray) -> np.ndarray:
    out = np.array(a, copy=True)
    out[:, 0] *= -1
    return out


def static_features(
    a: np.ndarray,
    align2d: bool = False,
    pairwise: bool = True,
    angles: bool = True,
) -> np.ndarray:
    """63 raw coordinates plus optional 210 pairwise distances and 10 angles."""
    a = normalize_hand(a, align2d=align2d)
    parts = [a.reshape(-1)]
    if pairwise:
        parts.append(
            np.array(
                [
                    np.linalg.norm(a[i] - a[j])
                    for i in range(21)
                    for j in range(i + 1, 21)
                ]
            )
        )
    if angles:
        angle_values = []
        for chain in FINGER_CHAINS:
            for k in range(2):
                u = a[chain[k]] - a[chain[k + 1]]
                v = a[chain[k + 2]] - a[chain[k + 1]]
                denom = (np.linalg.norm(u) * np.linalg.norm(v)) or 1e-9
                cos = float(np.dot(u, v) / denom)
                angle_values.append(math.acos(max(-1.0, min(1.0, cos))))
        parts.append(np.array(angle_values))
    return np.concatenate(parts)


def two_hand_features(
    a: np.ndarray | None,
    b: np.ndarray | None,
    align2d: bool = False,
    pairwise: bool = True,
    angles: bool = True,
) -> np.ndarray:
    """Canonical two-hand vector: hands sorted left-to-right by wrist x."""
    one_size = 63 + (210 if pairwise else 0) + (10 if angles else 0)
    if a is None and b is None:
        return np.zeros(2 * one_size + 6)
    if a is None:
        a, b = b, None
    elif b is not None and a[0, 0] > b[0, 0]:
        a, b = b, a
    left = static_features(a, align2d=align2d, pairwise=pairwise, angles=angles)
    right = (
        static_features(b, align2d=align2d, pairwise=pairwise, angles=angles)
        if b is not None
        else np.zeros(one_size)
    )
    inter = np.zeros(6)
    if b is not None:
        na, nb = normalize_hand(a, align2d=align2d), normalize_hand(b, align2d=align2d)
        inter[0] = np.linalg.norm(na[0] - nb[0])
        for k, tip in enumerate([4, 8, 12, 16, 20]):
            inter[k + 1] = np.linalg.norm(na[tip] - nb[tip])
    return np.concatenate([left, right, inter])


def sequence_summary(vectors: np.ndarray, target_frames: int = 24) -> np.ndarray:
    """mean, std, min, max, delta, motion for a resampled sequence."""
    vectors = np.asarray(vectors, dtype=np.float64)
    n = len(vectors)
    if n == 0:
        return np.array([])
    if n == 1:
        resampled = np.repeat(vectors, target_frames, axis=0)
    else:
        xs = np.linspace(0, n - 1, target_frames)
        lo = np.floor(xs).astype(int)
        hi = np.minimum(n - 1, lo + 1)
        frac = (xs - lo)[:, None]
        resampled = vectors[lo] * (1 - frac) + vectors[hi] * frac
    mean = resampled.mean(axis=0)
    std = resampled.std(axis=0)
    lo = resampled.min(axis=0)
    hi = resampled.max(axis=0)
    delta = resampled[-1] - resampled[0]
    motion = (
        np.abs(np.diff(resampled, axis=0)).mean(axis=0)
        if n > 1
        else np.zeros_like(mean)
    )
    return np.concatenate([mean, std, lo, hi, delta, motion])


@dataclass
class TrainResult:
    params: list[np.ndarray]
    history: list[float]
    best_acc: float


def train_mlp(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_val: np.ndarray,
    y_val: np.ndarray,
    n_classes: int,
    hidden: int = 128,
    epochs: int = 90,
    lr: float = 2e-3,
    l2: float = 1e-4,
    seed: int = 7,
    batch_size: int = 128,
) -> TrainResult:
    rng = np.random.RandomState(seed)
    n, d = x_train.shape
    w1 = rng.randn(d, hidden) * math.sqrt(2.0 / d)
    b1 = np.zeros(hidden)
    w2 = rng.randn(hidden, n_classes) * math.sqrt(2.0 / hidden)
    b2 = np.zeros(n_classes)
    params = [w1, b1, w2, b2]
    m = [np.zeros_like(p) for p in params]
    v = [np.zeros_like(p) for p in params]
    best = [p.copy() for p in params]
    best_acc = 0.0
    history: list[float] = []

    for epoch in range(1, epochs + 1):
        perm = rng.permutation(n)
        for start in range(0, n, batch_size):
            idx = perm[start : start + batch_size]
            xb, yb = x_train[idx], y_train[idx]
            h = np.maximum(xb @ w1 + b1, 0)
            p = softmax(h @ w2 + b2)
            p[np.arange(len(idx)), yb] -= 1
            p /= len(idx)
            gw2 = h.T @ p + l2 * w2
            gb2 = p.sum(axis=0)
            gh = p @ w2.T
            gh[h <= 0] = 0
            gw1 = xb.T @ gh + l2 * w1
            gb1 = gh.sum(axis=0)
            for i, (param, grad) in enumerate(zip(params, [gw1, gb1, gw2, gb2])):
                m[i] = 0.9 * m[i] + 0.1 * grad
                v[i] = 0.999 * v[i] + 0.001 * grad * grad
                mh = m[i] / (1 - 0.9**epoch)
                vh = v[i] / (1 - 0.999**epoch)
                param -= lr * mh / (np.sqrt(vh) + 1e-8)
        acc = evaluate_mlp(params, x_val, y_val)
        history.append(acc)
        if acc > best_acc:
            best_acc = acc
            best = [p.copy() for p in params]
    return TrainResult(best, history, best_acc)


def evaluate_mlp(params: list[np.ndarray], x: np.ndarray, y: np.ndarray) -> float:
    w1, b1, w2, b2 = params
    h = np.maximum(x @ w1 + b1, 0)
    pred = np.argmax(h @ w2 + b2, axis=1)
    return float((pred == y).mean())


def predict_proba(params: list[np.ndarray], x: np.ndarray) -> np.ndarray:
    w1, b1, w2, b2 = params
    h = np.maximum(x @ w1 + b1, 0)
    return softmax(h @ w2 + b2)


def stratified_group_split(
    labels: Iterable[str],
    frame_indices: Iterable[int],
    group_size: int = 25,
    test_fraction: float = 0.2,
    seed: int = 42,
):
    """Group-aware split. Groups are (class, frame_index // group_size)."""
    labels = list(labels)
    frame_indices = list(frame_indices)
    groups = sorted(
        {f"{lab}:{int(i) // group_size}" for lab, i in zip(labels, frame_indices)}
    )
    rng = np.random.RandomState(seed)
    rng.shuffle(groups)
    cut = int(len(groups) * (1 - test_fraction))
    test_groups = set(groups[cut:])
    train_idx, test_idx = [], []
    for i, (lab, frame) in enumerate(zip(labels, frame_indices)):
        group = f"{lab}:{int(frame) // group_size}"
        (test_idx if group in test_groups else train_idx).append(i)
    return np.array(train_idx), np.array(test_idx), sorted(test_groups)


def round_list(values, digits: int = 5):
    if isinstance(values, np.ndarray):
        values = values.tolist()
    if isinstance(values, dict):
        return {key: round_list(value, digits) for key, value in values.items()}
    if isinstance(values, list):
        return [round_list(v, digits) for v in values]
    if isinstance(values, float):
        return round(values, digits)
    return values


def write_js_module(path: str, const_name: str, payload: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    body = json.dumps(round_list(payload, 6), ensure_ascii=False, separators=(",", ":"))
    with open(path, "w", encoding="utf-8") as f:
        f.write("/* eslint-disable */\n")
        f.write("// Generated by scripts/train_*.py. Do not edit by hand.\n")
        f.write(f"export const {const_name} = {body};\n")


def load_npy_from_zip(zf: zipfile.ZipFile, name: str) -> np.ndarray:
    with zf.open(name) as fh:
        return np.load(io.BytesIO(fh.read()), allow_pickle=False)

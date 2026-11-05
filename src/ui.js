import { CONNECTIONS, LM, TIPS } from "./lib/landmarks.js";
import { HANDSHAPE_PROTOTYPES } from "./data/prototypes.js";
import { formatElapsed } from "./telemetry.js";

export const $ = (id) => document.getElementById(id);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function setText(el, value) {
  if (el && el.textContent !== String(value)) el.textContent = String(value);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function pointsOf(landmarks) {
  return landmarks.map((point) => Array.isArray(point)
    ? { x: point[0], y: point[1], z: point[2] ?? 0 }
    : { x: point.x, y: point.y, z: point.z ?? 0 });
}

/** Render a 21-point hand as an inline SVG, rotated upright for comparison. */
export function handSvg(landmarks, { className = "mini-hand", label = "handshape", decorative = false } = {}) {
  if (!landmarks?.length) return "";
  const raw = pointsOf(landmarks);
  const wrist = raw[0];
  const middleMcp = raw[LM.MIDDLE_MCP];
  const angle = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x);
  const rotation = -Math.PI / 2 - angle;
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const points = raw.map((point) => {
    const dx = point.x - wrist.x;
    const dy = point.y - wrist.y;
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const width = Math.max(1e-6, maxX - minX);
  const height = Math.max(1e-6, maxY - minY);
  const pad = 12;
  const scale = Math.min((100 - pad * 2) / width, (120 - pad * 2) / height);
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (120 - height * scale) / 2;
  const x = (p) => (p.x - minX) * scale + offsetX;
  const y = (p) => 120 - ((p.y - minY) * scale + offsetY);

  const palm = [0, 5, 9, 13, 17]
    .map((index) => `${x(points[index]).toFixed(2)},${y(points[index]).toFixed(2)}`)
    .join(" ");
  const lines = CONNECTIONS.map(([a, b]) =>
    `<line x1="${x(points[a]).toFixed(2)}" y1="${y(points[a]).toFixed(2)}" x2="${x(points[b]).toFixed(2)}" y2="${y(points[b]).toFixed(2)}" />`).join("");
  const dots = points.map((point, index) => {
    const isTip = TIPS.includes(index);
    return `<circle class="${isTip ? "tip" : ""}" cx="${x(point).toFixed(2)}" cy="${y(point).toFixed(2)}" r="${isTip ? 4 : 2.8}" />`;
  }).join("");
  const accessibility = decorative
    ? 'aria-hidden="true"'
    : `role="img" aria-label="${escapeHTML(label)}"`;
  return `<svg class="${className}" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" ${accessibility}><polygon class="palm" points="${palm}" />${lines}${dots}</svg>`;
}

export function prototypeFor(language, letter) {
  return HANDSHAPE_PROTOTYPES[language]?.[letter] ?? null;
}

export function alphabetLetters(language) {
  const prototypes = HANDSHAPE_PROTOTYPES[language];
  if (!prototypes) return [];
  return Object.keys(prototypes).sort((a, b) => a.localeCompare(b));
}

export function renderAlphabetStrip(container, language = "ASL", limit = 14) {
  if (!container) return;
  const letters = alphabetLetters(language).slice(0, limit);
  container.innerHTML = letters.map((letter) => {
    const prototype = prototypeFor(language, letter);
    return `<button class="alphabet-card" type="button" data-letter="${escapeHTML(letter)}" data-language="${escapeHTML(language)}">
      ${handSvg(prototype?.landmarks, { label: `${language} ${letter}`, decorative: true })}
      <strong>${escapeHTML(letter)}</strong>
      <small>${language} handshape</small>
    </button>`;
  }).join("");
}

export function renderLearnGrid(container, language = "ASL") {
  if (!container) return;
  const letters = alphabetLetters(language);
  if (!letters.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon"><svg class="icon" aria-hidden="true"><use href="#i-database"></use></svg></div>
      <h3>No bundled reference cards for ${escapeHTML(language)}</h3>
      <p>BSL is rule-based and experimental. A permissively licensed BSL landmark corpus is still needed before reference cards can be generated.</p>
    </div>`;
    return;
  }
  container.innerHTML = letters.map((letter) => {
    const prototype = prototypeFor(language, letter);
    return `<button class="learn-card" type="button" data-letter="${escapeHTML(letter)}" data-language="${escapeHTML(language)}">
      ${handSvg(prototype?.landmarks, { label: `${language} ${letter}`, decorative: true })}
      <strong>${escapeHTML(letter)}</strong>
      <small>${escapeHTML(language)}</small>
    </button>`;
  }).join("");
}

export function renderTop3(container, prediction) {
  if (!container) return;
  if (!prediction?.top3?.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = prediction.top3.map((candidate, index) =>
    `<span class="candidate ${index === 0 ? "is-best" : ""}"><b>${escapeHTML(candidate.id)}</b>${pct(candidate.confidence, 0)}</span>`).join("");
}

export function renderTranscript(container, emptyEl, log, filter = {}) {
  if (!container) return { visible: 0, total: 0 };
  const all = log?.entries ?? [];
  const state = log?.state ?? {};
  const query = String(filter.query ?? "").trim().toLowerCase();
  const minConfidence = Number(filter.minConfidence ?? 0);
  const entries = all.filter((entry) => {
    const haystack = `${entry.id} ${entry.label}`.toLowerCase();
    return (!query || haystack.includes(query)) && (entry.confidence ?? 0) >= minConfidence;
  });

  if (!all.length) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    container.innerHTML = "";
    return { visible: 0, total: 0 };
  }
  if (emptyEl) emptyEl.classList.add("hidden");
  if (!entries.length) {
    container.innerHTML = `<div class="transcript-no-match">No signs match this filter.</div>`;
    return { visible: 0, total: all.length };
  }

  const startedAt = state.startedAt ?? Date.now();
  container.innerHTML = entries.map((entry) => {
    const elapsed = Math.max(0, entry.at - startedAt);
    return `<div class="transcript-row">
      <span class="time">${formatElapsed(elapsed)}</span>
      <span class="sign">${escapeHTML(entry.id)}<small>${escapeHTML(entry.label)}</small></span>
      <span class="conf"><b>${pct(entry.confidence, 0)}</b>confidence</span>
    </div>`;
  }).join("");
  return { visible: entries.length, total: all.length };
}

export function renderSelfTest(badge, titleEl, detailsEl, result) {
  if (!result) return;
  const allPass = result.passed === result.total;
  if (badge) {
    badge.textContent = `self-test ${allPass ? "✓" : "⚠"} ${result.passed}/${result.total}`;
    badge.classList.toggle("pass", allPass);
    badge.classList.toggle("fail", !allPass);
  }
  if (titleEl) {
    titleEl.textContent = allPass
      ? `All ${result.total} checks pass`
      : `${result.total - result.passed} of ${result.total} checks need attention`;
  }
  if (detailsEl) {
    detailsEl.innerHTML = result.layers.map((layer) => {
      const layerPass = layer.passed === layer.total;
      const failures = layer.results.filter((r) => !r.pass);
      const rows = failures.length
        ? failures.map((r) => `<div class="self-test-row">
          <span class="bad">✗</span><span class="name">${escapeHTML(r.name)}</span>
          <span class="detail">expected ${escapeHTML(r.expected)}, got ${escapeHTML(r.actual ?? r.error ?? "null")}</span>
        </div>`).join("")
        : `<div class="self-test-row"><span class="ok">✓</span><span class="name">all ${layer.total} checks passed</span><span class="detail">held-out</span></div>`;
      return `<div class="self-test-layer">
        <div class="self-test-layer-head">
          <strong>${escapeHTML(layer.name)}</strong>
          <span style="color:${layerPass ? "var(--success)" : "var(--danger)"}">${layer.passed}/${layer.total}</span>
        </div>
        <p>${escapeHTML(layer.description)}</p>
        ${rows}
      </div>`;
    }).join("");
  }
}

export function renderDatasetList(container, languages) {
  if (!container) return;
  const seen = new Set();
  const items = [];
  for (const language of languages) {
    const dataset = language.dataset;
    if (!dataset?.name || seen.has(dataset.name)) continue;
    seen.add(dataset.name);
    const source = dataset.source
      ? `<a href="${escapeHTML(dataset.source)}" target="_blank" rel="noopener noreferrer">source ↗</a>`
      : "no public source bundled";
    items.push(`<div class="dataset-item">
      <strong>${escapeHTML(dataset.name)}</strong>
      <span>${escapeHTML(dataset.author ?? "—")} · ${escapeHTML(dataset.license ?? "—")} · ${source}</span>
      ${dataset.note ? `<span>${escapeHTML(dataset.note)}</span>` : ""}
    </div>`);
  }
  items.push(`<div class="dataset-item">
    <strong>MediaPipe Hands</strong>
    <span>Google · Apache-2.0 · vendored locally in <span class="mono">vendor/mediapipe/hands</span></span>
  </div>`);
  container.innerHTML = items.join("");
}

let toastTimer = 0;

export function toast(message, { type = "info", duration = 3200 } = {}) {
  const region = $("toast-region");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  const icon = type === "success" ? "i-check" : type === "error" ? "i-alert" : "i-info";
  item.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${icon}"></use></svg><span>${escapeHTML(message)}</span>`;
  region.append(item);
  clearTimeout(toastTimer);
  const remove = () => {
    item.classList.add("out");
    setTimeout(() => item.remove(), 260);
  };
  toastTimer = setTimeout(remove, duration);
  item.addEventListener("click", remove, { once: true });
}

/**
 * Session log and export helpers.
 *
 * The transcript is derived from the accumulator's committed tokens, so
 * undo/clear stay consistent without a second source of truth.
 */
export class SessionLog {
  constructor() {
    this.state = {
      entries: [],
      glosses: [],
      english: "",
      language: null,
      startedAt: Date.now(),
    };
  }

  update(state) {
    this.state = {
      entries: (state.tokens ?? []).map((token) => ({
        id: token.id,
        label: token.label ?? token.id,
        at: token.at,
        confidence: token.confidence ?? 0,
      })),
      glosses: state.glosses ?? [],
      english: state.english ?? "",
      language: state.language ?? null,
      startedAt: state.sessionStartedAt ?? this.state.startedAt,
    };
    return this.state;
  }

  clear() {
    this.state = {
      entries: [],
      glosses: [],
      english: "",
      language: this.state.language,
      startedAt: Date.now(),
    };
  }

  get entries() {
    return this.state.entries;
  }

  get count() {
    return this.state.entries.length;
  }

  get durationMs() {
    if (!this.state.entries.length) return 0;
    return Math.max(0, this.state.entries[this.state.entries.length - 1].at - this.state.startedAt);
  }

  toTXT() {
    const lines = [
      "Glipter — session transcript",
      "============================",
      `Exported: ${new Date().toISOString()}`,
      `Language: ${this.state.language ?? "—"}`,
      `Duration: ${formatDuration(this.durationMs)}`,
      `Signs: ${this.state.entries.length}`,
      "",
      `Gloss: ${this.state.glosses.join(" ") || "—"}`,
      `English: ${this.state.english || "—"}`,
      "",
      "Timestamped signs",
      "-----------------",
    ];
    for (const entry of this.state.entries) {
      lines.push(
        `${formatElapsed(entry.at - this.state.startedAt)}  ${entry.id.padEnd(10)}  ${(entry.confidence * 100).toFixed(0)}%  ${entry.label}`,
      );
    }
    lines.push("", "This is a Tier 0 demonstrator. It has not been validated by Deaf signers and is not a substitute for a professional interpreter.");
    return lines.join("\n");
  }

  toCSV() {
    const rows = [
      ["timestamp_iso", "elapsed_ms", "sign", "label", "confidence", "language"],
      ...this.state.entries.map((entry) => [
        new Date(entry.at).toISOString(),
        String(Math.max(0, entry.at - this.state.startedAt)),
        entry.id,
        entry.label,
        entry.confidence.toFixed(4),
        this.state.language ?? "",
      ]),
    ];
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  toJSON() {
    return JSON.stringify({
      app: "Glipter",
      tier: "Tier 0 demonstrator",
      exportedAt: new Date().toISOString(),
      language: this.state.language,
      startedAt: new Date(this.state.startedAt).toISOString(),
      durationMs: this.durationMs,
      glosses: this.state.glosses,
      english: this.state.english,
      entries: this.state.entries.map((entry) => ({
        ...entry,
        elapsedMs: Math.max(0, entry.at - this.state.startedAt),
        timestamp: new Date(entry.at).toISOString(),
      })),
      disclaimer: "Not validated by Deaf signers. Not a substitute for a professional interpreter.",
    }, null, 2);
  }

  toTranscriptJSON() {
    return this.toJSON();
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatElapsed(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

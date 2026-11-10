import { joinLetterRuns, reorderFor, toSentenceCase } from "./grammar.js";
import { phraseLabel } from "./phrases.js";

/**
 * Gloss accumulator: turns a stream of committed signs into a gloss line and
 * a readable English line.
 *
 * Letters are buffered into words. Multi-letter signs (e.g. HELLO, FATHER)
 * are emitted as whole words. A long pause closes the current word; a longer
 * pause places a sentence boundary in the transcript.
 */
export class TextAccumulator {
  constructor({ profile, onGloss, onEnglish, onState, wordGapMs, sentenceGapMs }) {
    this.profile = profile;
    this.onGloss = onGloss ?? (() => {});
    this.onEnglish = onEnglish ?? (() => {});
    this.onState = onState ?? (() => {});
    this.wordGapMs = wordGapMs ?? profile?.wordGapMs ?? 2200;
    this.sentenceGapMs = sentenceGapMs ?? profile?.sentenceGapMs ?? 9000;
    this.tokens = [];
    this.currentWord = "";
    this.currentConfidence = 0;
    this.lastPushAt = 0;
    this.lastCommitAt = 0;
    this.autoCommit = true;
    this.reorderEnabled = true;
    this.sessionStartedAt = Date.now();
    this._timer = setInterval(() => this._tick(), 300);
  }

  /**
   * Demo playback is scripted, so its explicit word boundaries should be the
   * only thing that closes a word. Live recognition keeps the timed pause.
   */
  setAutoCommit(enabled) {
    this.autoCommit = Boolean(enabled);
  }

  /**
   * The scripted demo shows the sign-to-text pipeline. Keep its partial
   * English in sign order until the sentence is complete, so a KSL verb move
   * cannot make words jump around mid-sentence.
   */
  setReorderEnabled(enabled) {
    this.reorderEnabled = Boolean(enabled);
  }

  setProfile(profile) {
    this.profile = profile;
    this.wordGapMs = profile?.wordGapMs ?? 2200;
    this.sentenceGapMs = profile?.sentenceGapMs ?? 9000;
    this.emit();
  }

  push(gesture, meta = {}) {
    if (gesture === null || gesture === undefined || gesture === "") {
      // A released hand is not a word boundary. Word boundaries are timed
      // pauses, so repeated letters (e.g. the two Ls in HELLO) can be
      // committed without splitting the word.
      this.emit();
      return;
    }

    const id = typeof gesture === "string" ? gesture : gesture.id;
    if (!id) return;
    const confidence = typeof gesture === "object"
      ? (gesture.confidence ?? meta.confidence ?? 0)
      : (meta.confidence ?? 0);
    const label = typeof gesture === "object" ? gesture.label : meta.label;
    const now = Date.now();
    const gap = now - this.lastPushAt;
    this.lastPushAt = now;

    if (this.autoCommit && gap > this.wordGapMs) this.commitWord();

    if (id.length === 1 && /[A-Za-z0-9]/.test(id)) {
      this.currentWord += id.toUpperCase();
      this.currentConfidence = Math.max(this.currentConfidence, confidence);
    } else {
      this.commitWord();
      this.pushToken(id, confidence, label);
    }
    this.emit();
  }

  pushToken(id, confidence = 0, label = null) {
    this.tokens.push({
      id,
      label: label ?? this.profile?.labels?.[id] ?? phraseLabel(id) ?? id,
      at: Date.now(),
      confidence,
    });
    this.lastCommitAt = Date.now();
  }

  commitWord() {
    if (!this.currentWord) return;
    this.pushToken(this.currentWord, this.currentConfidence);
    this.currentWord = "";
    this.currentConfidence = 0;
  }

  _tick() {
    if (!this.autoCommit) return;
    if (!this.lastPushAt) return;
    const now = Date.now();
    if (this.currentWord && now - this.lastPushAt > this.wordGapMs) {
      this.commitWord();
      this.emit();
    }
  }

  getGlosses() {
    return [
      ...this.tokens.map((t) => t.id),
      ...(this.currentWord ? [this.currentWord] : []),
    ];
  }

  getEnglish() {
    const glosses = this.getGlosses();
    return this.reorderEnabled
      ? reorderFor(this.profile, glosses)
      : toSentenceCase(joinLetterRuns(glosses));
  }

  getState() {
    const glosses = this.getGlosses();
    return {
      glosses,
      tokens: this.tokens.slice(),
      currentWord: this.currentWord,
      english: this.getEnglish(),
      sessionStartedAt: this.sessionStartedAt,
      language: this.profile?.id ?? null,
    };
  }

  emit() {
    const state = this.getState();
    this.onGloss(state.glosses);
    this.onEnglish(state.english);
    this.onState(state);
  }

  undo() {
    if (this.currentWord.length) {
      this.currentWord = this.currentWord.slice(0, -1);
    } else {
      this.tokens.pop();
    }
    this.emit();
  }

  clear() {
    this.tokens = [];
    this.currentWord = "";
    this.currentConfidence = 0;
    this.lastPushAt = 0;
    this.lastCommitAt = 0;
    this.sessionStartedAt = Date.now();
    this.emit();
  }

  destroy() {
    clearInterval(this._timer);
  }
}

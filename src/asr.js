/**
 * Automatic speech recognition (ASR) using the browser's SpeechRecognition
 * API. Support and offline behaviour are browser-dependent: Chromium-based
 * browsers may use a network service, while some platforms use an on-device
 * recogniser. The UI labels this honestly and provides a text fallback.
 */
export class SpeechInput {
  constructor({ lang = "en-US", onTranscript, onStatus, onError } = {}) {
    this.lang = lang;
    this.onTranscript = onTranscript ?? (() => {});
    this.onStatus = onStatus ?? (() => {});
    this.onError = onError ?? (() => {});
    this.recognition = null;
    this.listening = false;
    this.finalText = "";
    this.interimText = "";
    this.restartTimer = 0;
    this.autoRestart = true;
  }

  static get supported() {
    return typeof window !== "undefined"
      && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  get supported() {
    return SpeechInput.supported;
  }

  get text() {
    return [this.finalText, this.interimText].filter(Boolean).join(" ").trim();
  }

  setLang(lang) {
    this.lang = lang || "en-US";
    if (this.listening) {
      this.restart();
    }
  }

  _emit() {
    this.onTranscript({
      finalText: this.finalText,
      interimText: this.interimText,
      text: this.text,
      listening: this.listening,
    });
  }

  _create() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) throw new Error("Speech recognition is not supported in this browser.");
    const recognition = new Recognition();
    recognition.lang = this.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.listening = true;
      this.onStatus("listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          this.finalText = `${this.finalText} ${transcript}`.replace(/\s+/g, " ").trim();
        } else {
          interim += transcript;
        }
      }
      this.interimText = interim.trim();
      this._emit();
    };

    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      this.listening = false;
      const fatal = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"];
      if (fatal.includes(code)) {
        this._wantListening = false;
        this.autoRestart = false;
      } else {
        this.autoRestart = true;
      }
      this.onStatus(code === "no-speech" ? "silent" : "error", code);
      if (fatal.includes(code)) this.onError(code);
    };

    recognition.onend = () => {
      this.listening = false;
      if (this.autoRestart && this._wantListening) {
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this._wantListening) this._startRecognition();
        }, 320);
      } else {
        this.onStatus("idle");
      }
    };

    return recognition;
  }

  _startRecognition() {
    try {
      this.recognition = this._create();
      this.recognition.start();
      this.listening = true;
      this.onStatus("starting");
    } catch (error) {
      this.listening = false;
      this._wantListening = false;
      this.onStatus("error", error.message);
      this.onError(error.message);
    }
  }

  start() {
    if (!this.supported) {
      this.onStatus("unsupported");
      this.onError("Speech recognition is not supported in this browser. Use the text box instead.");
      return false;
    }
    if (this._wantListening) return true;
    this._wantListening = true;
    this.autoRestart = true;
    this._startRecognition();
    return true;
  }

  stop() {
    this._wantListening = false;
    this.autoRestart = false;
    clearTimeout(this.restartTimer);
    try {
      this.recognition?.stop();
    } catch {
      // Ignore.
    }
    this.listening = false;
    this.onStatus("idle");
  }

  abort() {
    this._wantListening = false;
    this.autoRestart = false;
    clearTimeout(this.restartTimer);
    try {
      this.recognition?.abort();
    } catch {
      // Ignore.
    }
    this.listening = false;
    this.onStatus("idle");
  }

  restart() {
    const wasListening = this._wantListening;
    this.abort();
    if (wasListening) setTimeout(() => this.start(), 120);
  }

  clear() {
    this.finalText = "";
    this.interimText = "";
    this._emit();
  }
}

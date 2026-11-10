/**
 * Spoken-language catalogue and quick conversation phrases.
 *
 * One setting drives the embedded voice, speech recognition, quick phrases,
 * and the speech-to-sign preview. UI chrome stays English for now; the
 * conversation content is available in these languages.
 */
export const SPOKEN_LANGUAGES = Object.freeze([
  {
    code: "en",
    label: "English",
    english: "English",
    asr: "en-US",
    phrases: ["Hello", "Thank you", "Please", "Yes", "No", "I love you", "Help", "Sorry"],
  },
  {
    code: "sw",
    label: "Kiswahili",
    english: "Swahili",
    asr: "sw-KE",
    phrases: ["Habari", "Asante", "Tafadhali", "Ndiyo", "Hapana", "Nakupenda", "Nisaidie", "Samahani"],
    translations: {
      hello: "Habari",
      "thank you": "Asante",
      please: "Tafadhali",
      yes: "Ndiyo",
      no: "Hapana",
      "i love you": "Nakupenda",
      help: "Nisaidie",
      sorry: "Samahani",
      "hello my name is glipter": "Habari, jina langu ni Glipter.",
      "my name is glipter": "Jina langu ni Glipter.",
      "hello my name is": "Habari, jina langu ni",
      "my name is": "Jina langu ni",
      my: "yangu",
      name: "jina",
      is: "ni",
      father: "baba",
    },
  },
  {
    code: "af",
    label: "Afrikaans",
    english: "Afrikaans",
    asr: "af-ZA",
    phrases: ["Hallo", "Dankie", "Asseblief", "Ja", "Nee", "Ek is lief vir jou", "Help my", "Jammer"],
    translations: {
      hello: "Hallo",
      "thank you": "Dankie",
      please: "Asseblief",
      yes: "Ja",
      no: "Nee",
      "i love you": "Ek is lief vir jou",
      help: "Help my",
      sorry: "Jammer",
      "hello my name is glipter": "Hallo, my naam is Glipter.",
      "my name is glipter": "My naam is Glipter.",
      "hello my name is": "Hallo, my naam is",
      "my name is": "My naam is",
      my: "my",
      name: "naam",
      is: "is",
      father: "pa",
    },
  },
  {
    code: "am",
    label: "አማርኛ",
    english: "Amharic",
    asr: "am-ET",
    phrases: ["ሰላም", "አመሰግናለሁ", "እባክህ", "አዎ", "አይ", "እወድሃለሁ", "እርዳኝ", "ይቅርታ"],
    translations: {
      hello: "ሰላም",
      "thank you": "አመሰግናለሁ",
      please: "እባክህ",
      yes: "አዎ",
      no: "አይ",
      "i love you": "እወድሃለሁ",
      help: "እርዳኝ",
      sorry: "ይቅርታ",
      "hello my name is glipter": "ሰላም፣ ስሜ ግሊፕተር ነው።",
      "my name is glipter": "ስሜ ግሊፕተር ነው።",
      "hello my name is": "ሰላም፣ ስሜ",
      "my name is": "ስሜ",
      my: "የእኔ",
      name: "ስም",
      is: "ነው",
      father: "አባት",
    },
  },
  {
    code: "tn",
    label: "Setswana",
    english: "Setswana",
    asr: "tn-ZA",
    phrases: ["Dumela", "Ke a leboga", "Ka kopo", "Ee", "Nnyaa", "Ke a go rata", "Nthusa", "Ke kopa tshwarelo"],
    translations: {
      hello: "Dumela",
      "thank you": "Ke a leboga",
      please: "Ka kopo",
      yes: "Ee",
      no: "Nnyaa",
      "i love you": "Ke a go rata",
      help: "Nthusa",
      sorry: "Ke kopa tshwarelo",
      "hello my name is glipter": "Dumela, leina la me ke Glipter.",
      "my name is glipter": "Leina la me ke Glipter.",
      "hello my name is": "Dumela, leina la me ke",
      "my name is": "Leina la me ke",
      my: "la me",
      name: "leina",
      is: "ke",
      father: "rre",
    },
  },
  {
    code: "om",
    label: "Afaan Oromoo",
    english: "Oromo",
    asr: "om-ET",
    phrases: ["Nagaa", "Galatoomi", "Maaloo", "Eeyyee", "Lakki", "Sin jaalladha", "Na gargaari", "Dhiifama"],
    translations: {
      hello: "Nagaa",
      "thank you": "Galatoomi",
      please: "Maaloo",
      yes: "Eeyyee",
      no: "Lakki",
      "i love you": "Sin jaalladha",
      help: "Na gargaari",
      sorry: "Dhiifama",
      "hello my name is glipter": "Nagaa, maqaan koo Glipter.",
      "my name is glipter": "Maqaan koo Glipter.",
      "hello my name is": "Nagaa, maqaan koo",
      "my name is": "Maqaan koo",
      my: "koo",
      name: "maqaa",
      is: "jedha",
      father: "abbaa",
    },
  },
  {
    code: "ti",
    label: "ትግርኛ",
    english: "Tigrinya",
    asr: "ti-ET",
    phrases: ["ሰላም", "የቐንየለይ", "በጃኻ", "እወ", "አይኮንን", "እፈትወካ", "ሓግዘኒ", "ይቕረታ"],
    translations: {
      hello: "ሰላም",
      "thank you": "የቐንየለይ",
      please: "በጃኻ",
      yes: "እወ",
      no: "አይኮንን",
      "i love you": "እፈትወካ",
      help: "ሓግዘኒ",
      sorry: "ይቕረታ",
      "hello my name is glipter": "ሰላም፣ ስመይ ግሊፕተር እዩ።",
      "my name is glipter": "ስመይ ግሊፕተር እዩ።",
      "hello my name is": "ሰላም፣ ስመይ",
      "my name is": "ስመይ",
      my: "ናተይ",
      name: "ስም",
      is: "እዩ",
      father: "ኣቦ",
    },
  },
]);

export function spokenLanguage(code) {
  return SPOKEN_LANGUAGES.find((language) => language.code === code) ?? SPOKEN_LANGUAGES[0];
}

export function quickPhrasesFor(code) {
  return spokenLanguage(code).phrases.slice();
}

export function spokenLanguageOptions() {
  return SPOKEN_LANGUAGES.map((language) => ({
    code: language.code,
    label: language.code === "en" ? language.label : `${language.label} · ${language.english}`,
  }));
}

/** TTS catalogue is the same list; eSpeak uses the code as its voice name. */
export const TTS_LANGUAGES = SPOKEN_LANGUAGES;

export function ttsLanguageLabel(code) {
  return spokenLanguage(code).label;
}

function normalizeForSpeech(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Small offline phrase pack for spoken output. This is not a general
 * translator: known conversation phrases and the demo sentence are mapped;
 * other words are passed through and may stay in English.
 */
export function translateForSpeech(text, code) {
  if (!text || code === "en") return String(text ?? "");
  const language = spokenLanguage(code);
  const clean = normalizeForSpeech(text);
  if (!clean) return String(text ?? "");
  const exact = language.translations?.[clean];
  if (exact) return exact;
  const words = clean.split(" ");
  let changed = false;
  const mapped = words.map((word) => {
    const translated = language.translations?.[word];
    if (translated) changed = true;
    return translated ?? word;
  });
  return changed ? mapped.join(" ") : String(text ?? "").trim();
}

export function hasPhraseTranslation(text, code) {
  if (!text || code === "en") return false;
  return Boolean(spokenLanguage(code).translations?.[normalizeForSpeech(text)]);
}

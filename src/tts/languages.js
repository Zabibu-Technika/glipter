/** Languages available in the embedded multilingual voice. */
export const TTS_LANGUAGES = Object.freeze([
  { code: "sw", label: "Kiswahili" },
  { code: "af", label: "Afrikaans" },
  { code: "am", label: "Amharic" },
  { code: "tn", label: "Setswana" },
  { code: "om", label: "Oromo" },
  { code: "ti", label: "Tigrinya" },
  { code: "en", label: "English" },
]);

export function ttsLanguageLabel(code) {
  return TTS_LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

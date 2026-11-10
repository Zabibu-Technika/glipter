/**
 * Phrase-level vocabulary shared by recognition, English rendering, and the
 * speech-to-sign preview.
 *
 * These are ASL-derived conversation gestures, not a validated KSL lexicon.
 * The UI must keep that distinction visible.
 */

export const PHRASE_ENGLISH = Object.freeze({
  ILY: "i love you",
  HELLO: "hello",
  "THANK-YOU": "thank you",
  PLEASE: "please",
  YES: "yes",
  NO: "no",
  SORRY: "sorry",
  HELP: "help",
  STOP: "stop",
  MORE: "more",
  FINISHED: "finished",
});

export const PHRASE_LABELS = Object.freeze({
  ILY: "I love you",
  HELLO: "Hello",
  "THANK-YOU": "Thank you",
  PLEASE: "Please",
  YES: "Yes",
  NO: "No",
  SORRY: "Sorry",
  HELP: "Help",
  STOP: "Stop",
  MORE: "More",
  FINISHED: "Finished",
});

export function phraseLabel(id) {
  return PHRASE_LABELS[id] ?? null;
}

export function phraseEnglish(id) {
  return PHRASE_ENGLISH[id] ?? null;
}

/** Spoken phrases that can be rendered back as a sign card or fingerspelling. */
export const SPOKEN_TO_SIGN = Object.freeze([
  { id: "ILY", matches: ["i love you", "i luv u", "ily", "love you", "nakupenda", "ek is lief vir jou", "ewedihalehu", "ke a go rata", "sin jaalladha", "efetweka"], note: "ASL-derived ILY handshape" },
  { id: "HELLO", matches: ["hello", "hi", "hey", "jambo", "habari", "hallo", "selam", "dumela", "nagaa", "ሰላም"], note: "Open-hand greeting" },
  { id: "THANK-YOU", matches: ["thank you", "thanks", "asante", "dankie", "ameseginalehu", "ke a leboga", "galatoomi", "yeqenyeley"], note: "Fingerspelled phrase card" },
  { id: "PLEASE", matches: ["please", "tafadhali", "asseblief", "ebakh", "ka kopo", "maaloo", "bejaka"], note: "Fingerspelled phrase card" },
  { id: "YES", matches: ["yes", "yeah", "ndiyo", "ja", "awo", "ee", "eeyyee", "ewe"], note: "Fist nod" },
  { id: "NO", matches: ["no", "nope", "hapana", "nee", "ay", "nnyaa", "lakki", "aykonin"], note: "Fingerspelled phrase card" },
  { id: "SORRY", matches: ["sorry", "samahani", "jammer", "yikirta", "tshwarelo", "dhiifama", "yiqreta"], note: "Fingerspelled phrase card" },
  { id: "HELP", matches: ["help", "help me", "nisadie", "nisaidie", "help my", "irdagn", "nthusa", "na gargaari", "hagzeni"], note: "Fist on an open palm" },
  { id: "STOP", matches: ["stop", "wait", "simama"], note: "Open palm" },
  { id: "MORE", matches: ["more", "zaidi"], note: "Fingerspelled phrase card" },
  { id: "FINISHED", matches: ["finished", "done", "imemalizika"], note: "Fingerspelled phrase card" },
]);

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function phraseForText(text) {
  const clean = normalize(text);
  if (!clean) return null;
  for (const entry of SPOKEN_TO_SIGN) {
    if (entry.matches.includes(clean)) return entry;
  }
  for (const entry of SPOKEN_TO_SIGN) {
    if (entry.matches.some((match) => clean.startsWith(`${match} `))) return entry;
  }
  return null;
}

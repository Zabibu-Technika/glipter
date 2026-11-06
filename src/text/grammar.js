/**
 * Small, transparent grammar layer.
 *
 * This is not a linguistically complete grammar model. It is a deterministic
 * surface-realisation step: fingerspelled letters are joined into words, and
 * KSL's S-O-V order gets a conservative verb move. Deaf reviewers should
 * replace these rules with language-specific grammar data.
 */

const KSL_VERBS = new Set([
  "EAT", "DRINK", "GO", "COME", "SEE", "WANT", "LIKE", "COOK", "READ", "WRITE",
  "GIVE", "TAKE", "HELP", "TEACH", "LEARN", "HEAR", "IS", "ARE", "AM",
]);

/** Merge runs of single-letter tokens into words. */
export function joinLetterRuns(tokens) {
  const out = [];
  let buffer = "";
  for (const raw of tokens) {
    const token = String(raw ?? "").trim();
    if (!token) continue;
    if (token.length === 1 && /[A-Za-z0-9]/.test(token)) {
      buffer += token.toUpperCase();
    } else {
      if (buffer) {
        out.push(buffer);
        buffer = "";
      }
      out.push(token.toUpperCase());
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

const ACRONYMS = new Set(["ASL", "KSL", "BSL", "USA", "UK", "TV", "OK", "ID"]);

const PROPER_NOUNS = new Map([
  ["GLIPTER", "Glipter"],
  ["ZABIBU", "Zabibu"],
  ["TEHILLAH", "Tehillah"],
]);

export function capitalize(sentence) {
  if (!sentence) return "";
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Sentence-case the English rendering while preserving known acronyms. */
export function toSentenceCase(words) {
  const out = words.map((word) => {
    if (!word) return word;
    if (PROPER_NOUNS.has(word)) return PROPER_NOUNS.get(word);
    if (ACRONYMS.has(word)) return word;
    if (word.length > 1 && word === word.toUpperCase()) return word.toLowerCase();
    return word;
  });
  if (out.length) out[0] = capitalize(out[0]);
  return out.join(" ");
}

export function punctuationForSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** ASL: largely S-V-O in the gloss stream; only join letter runs. */
export function reorderASL(tokens) {
  return toSentenceCase(joinLetterRuns(tokens));
}

/** BSL: passthrough with letter-run joining. */
export function reorderBSL(tokens) {
  return toSentenceCase(joinLetterRuns(tokens));
}

/**
 * KSL: S-O-V -> S-V-O.
 * If the final word is a known verb and there are at least three words, move
 * the verb directly after the subject. This is intentionally conservative:
 * unknown verbs are left alone rather than guessed.
 */
export function reorderKSL(tokens) {
  const words = joinLetterRuns(tokens);
  if (words.length < 3) return toSentenceCase(words);
  const last = words[words.length - 1];
  if (!KSL_VERBS.has(last)) return toSentenceCase(words);
  const verb = words.pop();
  const subject = words.shift();
  return toSentenceCase([subject, verb, ...words]);
}

export function reorderFor(profile, tokens) {
  if (typeof profile?.reorder === "function") return profile.reorder(tokens);
  return toSentenceCase(joinLetterRuns(tokens));
}

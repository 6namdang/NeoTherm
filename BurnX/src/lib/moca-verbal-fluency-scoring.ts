import {
  MOCA_VERBAL_FLUENCY_PASS_COUNT,
  type MocaVerbalFluencyCapture,
  type MocaVerbalFluencyRejectedWord,
  type MocaVerbalFluencyWord,
} from "../constants/forms/moca";

const PROPER_NOUN_BLOCKLIST = new Set([
  "france",
  "french",
  "frank",
  "fred",
  "fiona",
  "florida",
  "friday",
  "february",
  "facebook",
]);

function tokenize(transcript: string): string[] {
  return transcript.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
}

function verbStem(word: string): string {
  if (word.endsWith("ing") && word.length > 4) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 2) return word.slice(0, -1);
  return word;
}

export function emptyVerbalFluencyCapture(): MocaVerbalFluencyCapture {
  return {
    transcript: "",
    validWords: [],
    rejectedWords: [],
    validCount: 0,
    score: 0,
    durationMs: 0,
    completedAt: null,
  };
}

export function scoreVerbalFluency(
  transcript: string,
  durationMs: number,
): MocaVerbalFluencyCapture {
  const validWords: MocaVerbalFluencyWord[] = [];
  const rejectedWords: MocaVerbalFluencyRejectedWord[] = [];
  const seenStems = new Set<string>();
  const seenExact = new Set<string>();

  for (const token of tokenize(transcript)) {
    if (/^\d+$/.test(token)) {
      rejectedWords.push({ token, reason: "number" });
      continue;
    }

    if (!token.startsWith("f")) {
      rejectedWords.push({ token, reason: "not_f_letter" });
      continue;
    }

    if (PROPER_NOUN_BLOCKLIST.has(token)) {
      rejectedWords.push({ token, reason: "proper_noun" });
      continue;
    }

    if (seenExact.has(token)) {
      rejectedWords.push({ token, reason: "duplicate" });
      continue;
    }

    const stem = verbStem(token);
    if (seenStems.has(stem)) {
      rejectedWords.push({ token, reason: "verb_form" });
      continue;
    }

    seenExact.add(token);
    seenStems.add(stem);
    validWords.push({ word: token, stem });
  }

  const validCount = validWords.length;

  return {
    transcript: transcript.trim(),
    validWords,
    rejectedWords,
    validCount,
    score: validCount >= MOCA_VERBAL_FLUENCY_PASS_COUNT ? 1 : 0,
    durationMs,
    completedAt: Date.now(),
  };
}

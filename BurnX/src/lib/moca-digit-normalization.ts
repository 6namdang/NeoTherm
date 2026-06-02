const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/** Normalize spoken or typed digits to a compact digit string (e.g. "two one eight" → "218"). */
export function normalizeSpokenDigits(transcript: string): string {
  const tokens = transcript
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let out = "";
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      out += token;
      continue;
    }
    const mapped = DIGIT_WORDS[token];
    if (mapped !== undefined) out += mapped;
  }
  return out;
}

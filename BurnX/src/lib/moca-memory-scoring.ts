import { MOCA_MEMORY_WORDS, type MocaMemoryTrialCapture, type MocaMemoryWord } from "../constants/forms/moca";

const WORD_PATTERNS: Record<MocaMemoryWord, RegExp> = {
  face: /\bfaces?\b/i,
  velvet: /\bvelvets?\b/i,
  church: /\bchurches?\b/i,
  daisy: /\bdaisies?\b/i,
  red: /\bred\b/i,
};

export function detectMemoryWords(transcript: string): MocaMemoryWord[] {
  const found: MocaMemoryWord[] = [];
  for (const word of MOCA_MEMORY_WORDS) {
    if (WORD_PATTERNS[word].test(transcript)) found.push(word);
  }
  return found;
}

export function emptyMemoryTrialCapture() {
  return { transcript: "", detectedWords: [] as MocaMemoryWord[] };
}

export function scoreDelayedRecallResponse(response: string): MocaMemoryTrialCapture {
  const transcript = response.trim();
  return {
    transcript,
    detectedWords: detectMemoryWords(transcript),
  };
}

export function delayedRecallChecklist(response: string): Array<{
  word: MocaMemoryWord;
  recalled: boolean;
}> {
  const detected = new Set(detectMemoryWords(response));
  return MOCA_MEMORY_WORDS.map((word) => ({
    word,
    recalled: detected.has(word),
  }));
}

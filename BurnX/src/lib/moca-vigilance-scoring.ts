import {
  MOCA_VIGILANCE_LETTERS,
  type MocaVigilanceCapture,
  type MocaVigilanceLetterResult,
  type MocaVigilanceTap,
} from "../constants/forms/moca";

export function emptyVigilanceCapture(): MocaVigilanceCapture {
  return {
    taps: [],
    letterResults: [],
    errorCount: 0,
    score: 0,
    completedAt: null,
  };
}

export function scoreVigilance(
  letters: readonly string[] = MOCA_VIGILANCE_LETTERS,
  taps: MocaVigilanceTap[],
): MocaVigilanceCapture {
  const tappedIndices = new Set<number>();
  for (const tap of taps) {
    if (tap.letterIndex >= 0 && tap.letterIndex < letters.length) {
      tappedIndices.add(tap.letterIndex);
    }
  }

  const letterResults: MocaVigilanceLetterResult[] = letters.map((letter, index) => {
    const isTarget = letter === "A";
    const tapped = tappedIndices.has(index);
    let error: MocaVigilanceLetterResult["error"] = "none";
    if (isTarget && !tapped) error = "omission";
    if (!isTarget && tapped) error = "commission";
    return { index, letter, isTarget, tapped, error };
  });

  const errorCount = letterResults.filter((result) => result.error !== "none").length;

  return {
    taps: [...taps],
    letterResults,
    errorCount,
    score: errorCount <= 1 ? 1 : 0,
    completedAt: Date.now(),
  };
}

import {
  MOCA_ABSTRACTION_PAIRS,
  type MocaAbstractionCapture,
  type MocaAbstractionPairResult,
} from "../constants/forms/moca";

export function emptyAbstractionAnswers(): string[] {
  return Array.from({ length: MOCA_ABSTRACTION_PAIRS.length }, () => "");
}

export function emptyAbstractionCapture(): MocaAbstractionCapture {
  return {
    answers: emptyAbstractionAnswers(),
    results: [],
    correctCount: 0,
    score: 0,
    completedAt: null,
  };
}

function matchesKeywords(answer: string, keywords: readonly string[]): boolean {
  const normalized = answer.toLowerCase().trim();
  if (!normalized) return false;
  return keywords.some((keyword) => normalized.includes(keyword));
}

function matchesRejectKeywords(answer: string, rejectKeywords: readonly string[] | undefined): boolean {
  if (!rejectKeywords?.length) return false;
  const normalized = answer.toLowerCase().trim();
  return rejectKeywords.some((keyword) => normalized.includes(keyword));
}

export function scoreAbstraction(answers: string[]): MocaAbstractionCapture {
  const results: MocaAbstractionPairResult[] = MOCA_ABSTRACTION_PAIRS.map((pair, index) => {
    const answer = answers[index]?.trim() ?? "";
    const rejected = matchesRejectKeywords(answer, pair.rejectKeywords);
    const correct = !rejected && matchesKeywords(answer, pair.keywords);
    return {
      pairId: pair.id,
      left: pair.left,
      right: pair.right,
      answer,
      correct,
    };
  });

  const correctCount = results.filter((result) => result.correct).length;

  return {
    answers: [...answers],
    results,
    correctCount,
    score: correctCount as 0 | 1 | 2,
    completedAt: Date.now(),
  };
}

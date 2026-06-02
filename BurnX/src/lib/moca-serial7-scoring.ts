import {
  MOCA_SERIAL7_CORRECT_ANSWERS,
  MOCA_SERIAL7_SUBTRACTION_COUNT,
  type MocaSerial7Capture,
  type MocaSerial7SubtractionResult,
} from "../constants/forms/moca";

export function emptySerial7Answers(): string[] {
  return Array.from({ length: MOCA_SERIAL7_SUBTRACTION_COUNT }, () => "");
}

export function emptySerial7Capture(): MocaSerial7Capture {
  return {
    answers: emptySerial7Answers(),
    results: [],
    correctCount: 0,
    score: 0,
    completedAt: null,
  };
}

function parseAnswer(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreFromCorrectCount(correctCount: number): 0 | 1 | 2 | 3 {
  if (correctCount >= 4) return 3;
  if (correctCount >= 2) return 2;
  if (correctCount === 1) return 1;
  return 0;
}

export function scoreSerial7(answers: string[]): MocaSerial7Capture {
  const results: MocaSerial7SubtractionResult[] = MOCA_SERIAL7_CORRECT_ANSWERS.map(
    (expected, index) => {
      const answer = answers[index]?.trim() ?? "";
      const parsed = parseAnswer(answer);
      return {
        index,
        answer,
        parsed,
        expected,
        correct: parsed === expected,
      };
    },
  );

  const correctCount = results.filter((result) => result.correct).length;

  return {
    answers: [...answers],
    results,
    correctCount,
    score: scoreFromCorrectCount(correctCount),
    completedAt: Date.now(),
  };
}

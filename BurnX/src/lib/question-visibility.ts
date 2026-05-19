import type { Question } from "../constants/forms/onboarding";

export function isQuestionVisible(
  question: Question,
  answers: Record<string, unknown>,
): boolean {
  if (!("dependsOn" in question) || !question.dependsOn) return true;
  const parent = answers[question.dependsOn.question];
  return String(parent ?? "") === question.dependsOn.equals;
}

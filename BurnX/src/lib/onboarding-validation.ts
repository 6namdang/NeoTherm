import type { Question } from "../constants/forms/onboarding";
import { isQuestionVisible } from "./question-visibility";

function isEmpty(value: unknown, q: Question): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (q.type === "multi_select" && Array.isArray(value) && value.length === 0)
    return true;
  if (q.type === "boolean" && q.required && value !== true) return true;
  if (q.type === "number" && q.required) {
    if (typeof value === "string") return true;
    if (typeof value === "number" && !Number.isFinite(value)) return true;
  }
  return false;
}

export function validateQuestions(
  questions: Question[],
  answers: Record<string, unknown>,
): string | null {
  for (const q of questions) {
    if (!isQuestionVisible(q, answers) || !q.required) continue;
    if (isEmpty(answers[q.id], q)) {
      return `Please complete: ${q.label}`;
    }
  }
  return null;
}

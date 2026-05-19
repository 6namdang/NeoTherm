import type {
  ScaleAnswers,
  ScaleQuestionnaireForm,
  ScaleQuestionnaireQuestion,
} from "../constants/forms/types";

/** Flatten sections in order → questions in section order */
export function flattenQuestions(
  form: ScaleQuestionnaireForm,
): ScaleQuestionnaireQuestion[] {
  return form.sections.flatMap((s) => s.questions);
}

export function isVisible(
  question: ScaleQuestionnaireQuestion,
  answers: ScaleAnswers,
): boolean {
  const showIf = question.showIf;
  if (!showIf?.anyOf?.length) return true;

  return showIf.anyOf.some((cond) => {
    const raw = answers[cond.questionId];
    return raw === cond.equals;
  });
}

export function visibleQuestions(
  form: ScaleQuestionnaireForm,
  answers: ScaleAnswers,
): ScaleQuestionnaireQuestion[] {
  return flattenQuestions(form).filter((q) => isVisible(q, answers));
}

/** Next visible unanswered question in section→question stable order */
export function firstUnansweredVisible(
  form: ScaleQuestionnaireForm,
  answers: ScaleAnswers,
): ScaleQuestionnaireQuestion | null {
  for (const q of flattenQuestions(form)) {
    if (!isVisible(q, answers)) continue;
    const v = answers[q.id];
    if (v === undefined) return q;
  }
  return null;
}

export function answeredVisibleProgress(
  form: ScaleQuestionnaireForm,
  answers: ScaleAnswers,
): { answered: number; total: number } {
  const vis = visibleQuestions(form, answers);
  const total = Math.max(vis.length, 1);
  let answered = 0;
  for (const q of vis) {
    if (answers[q.id] !== undefined) answered += 1;
  }
  return { answered, total };
}

/** Walk backward in stable order among questions visible given current answers */
export function prevVisibleQuestionId(
  form: ScaleQuestionnaireForm,
  answers: ScaleAnswers,
  currentId: string,
): string | null {
  const flat = flattenQuestions(form);
  const i = flat.findIndex((q) => q.id === currentId);
  if (i <= 0) return null;
  for (let j = i - 1; j >= 0; j--) {
    const q = flat[j]!;
    if (isVisible(q, answers)) return q.id;
  }
  return null;
}

export function progressMeta(
  form: ScaleQuestionnaireForm,
  answers: ScaleAnswers,
  currentId: string | null | undefined,
): { n: number; m: number } {
  const vis = visibleQuestions(form, answers);
  const m = Math.max(vis.length, 1);
  const idx =
    currentId === null || currentId === undefined || currentId === ""
      ? -1
      : vis.findIndex((q) => q.id === currentId);
  const n = idx >= 0 ? idx + 1 : 1;
  return { n, m };
}

import { getFormById } from "../constants/forms";
import type { ScaleAnswers, ScaleQuestionnaireForm } from "../constants/forms/types";
import { visibleQuestions } from "./form-engine";
import { coerceAnswersRecord } from "./libre-scoring";

function formatAnswerValue(
  form: ScaleQuestionnaireForm,
  questionId: string,
  raw: unknown,
): string {
  if (raw === null || raw === undefined) return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "string") return raw.trim() === "" ? "—" : raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const q = form.sections
      .flatMap((s) => s.questions)
      .find((x) => x.id === questionId);
    if (q) {
      const scale = form.scales[q.scaleId];
      const labels = scale?.labels;
      if (labels && raw >= 0 && raw < labels.length) {
        return labels[raw] ?? String(raw);
      }
    }
    return String(raw);
  }
  return String(raw);
}

/**
 * Human-readable rows for clinician review (visible questions only; uses scale labels).
 */
export function formatClinicianAnswerRows(
  formId: string,
  answersRaw: Record<string, unknown>,
): { label: string; value: string }[] {
  const form = getFormById(formId);
  if (!form) {
    return Object.entries(answersRaw).map(([k, v]) => ({
      label: k,
      value: v === null || v === undefined ? "—" : String(v),
    }));
  }

  const coerced = coerceAnswersRecord(answersRaw);
  const ans: ScaleAnswers =
    coerced !== null ? (coerced as ScaleAnswers) : ({} as ScaleAnswers);

  const questions = visibleQuestions(form, ans);
  const rows: { label: string; value: string }[] = [];

  for (const q of questions) {
    const raw = answersRaw[q.id];
    if (raw === undefined || raw === null) continue;
    rows.push({
      label: q.text,
      value: formatAnswerValue(form, q.id, raw),
    });
  }

  if (rows.length > 0) return rows;

  return Object.entries(answersRaw).map(([k, v]) => ({
    label: k,
    value: v === null || v === undefined ? "—" : String(v),
  }));
}

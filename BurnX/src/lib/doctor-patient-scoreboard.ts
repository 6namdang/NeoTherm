
/**
 * Clinician score timelines from questionnaire submissions (mirrors patient dashboard metrics).
 */

import { ALL_EMA_FORMS } from "../constants/ema-forms";
import { ALL_FORMS, FORMS_BY_ID, getFormById } from "../constants/forms";
import type { ScaleQuestionnaireForm } from "../constants/forms/types";
import type { FormResponse } from "./api";
import { scoreCognitiveFunction } from "./cognitive-function-scoring";
import { scoreFatigue } from "./fatigue-scoring";
import { scoreGad7 } from "./gad7-scoring";
import {
  coerceAnswersRecord,
  computeLibreRadarScores,
} from "./libre-scoring";
import { scorePainIntensity } from "./pain-intensity-scoring";
import { computePsqiScores } from "./psqi-scoring";

export type ScoreTimelineCell = {
  createdAtIso: string;
  /** Short column label under values. */
  dateShort: string;
  value: string;
};

export type ScoreTimelineRow = {
  formId: string;
  title: string;
  cells: ScoreTimelineCell[];
};

export const DOCTOR_SCOREBOARD_FORM_IDS: readonly string[] = [
  ...ALL_FORMS.map((f) => f.id),
  ...ALL_EMA_FORMS.map((f) => f.id),
];

const DEFAULT_MAX_COLUMNS = 8;

function shortDateLabel(iso: string): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return "?";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(t));
  } catch {
    return iso.slice(5, 10);
  }
}

function titleForForm(formId: string): string {
  const f = getFormById(formId);
  const n = (f?.name ?? "").trim();
  return n !== "" ? n : formId;
}

function meanOfAnswerIndices(
  ans: Record<string, number>,
  form: ScaleQuestionnaireForm,
): number | null {
  const flat = form.sections.flatMap((s) => s.questions);
  const indices: number[] = [];
  for (const q of flat) {
    const v = ans[q.id];
    if (typeof v === "number" && Number.isFinite(v)) indices.push(v);
  }
  if (indices.length === 0) return null;
  return indices.reduce((a, b) => a + b, 0) / indices.length;
}

/** One headline number per submission for clinician table cells. */
export function summarizeFormResponseForScoreboard(
  formId: string,
  answersRaw: Record<string, unknown>,
): string | null {
  const ans = coerceAnswersRecord(answersRaw);
  if (ans === null || Object.keys(ans).length === 0) return null;

  switch (formId) {
    case "libre_v1": {
      const s = computeLibreRadarScores(ans);
      if (s.overallTScore === null) return null;
      return `${Math.round(s.overallTScore)}`;
    }
    case "psqi_v1": {
      const scored = computePsqiScores(ans, answersRaw as Record<string, unknown>);
      if (
        scored === null ||
        scored.total === null ||
        scored.isComplete !== true
      ) {
        return null;
      }
      return `${Math.round(scored.total)}`;
    }
    case "fatigue_v1": {
      const s = scoreFatigue(ans);
      if (s.tScore === null) return null;
      return `${Math.round(s.tScore)}`;
    }
    case "pain_intensity_v1": {
      const s = scorePainIntensity(ans);
      if (s.tScore === null) return null;
      return `${Math.round(s.tScore)}`;
    }
    case "gad7_v1": {
      const s = scoreGad7(ans);
      if (!s.isComplete || s.total === null) return null;
      return `${Math.round(s.total)}`;
    }
    case "cognitive_function_v1": {
      const s = scoreCognitiveFunction(ans);
      if (!s.isComplete || s.total === null) return null;
      return `${Math.round(s.total)}`;
    }
    case "pain_inference_v1": {
      const vals = Object.values(ans).filter(
        (x): x is number => typeof x === "number" && Number.isFinite(x),
      );
      if (vals.length === 0) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg.toFixed(1);
    }
    default:
      break;
  }

  if (
    formId === "ema_sleep_quality_v1" ||
    formId === "ema_pain_now_v1" ||
    formId === "ema_mood_v1"
  ) {
    const fd = FORMS_BY_ID[formId];
    if (!fd) return null;
    const avg = meanOfAnswerIndices(ans, fd);
    if (avg === null) return null;
    return avg.toFixed(1);
  }

  return null;
}

/**
 * Rows with up to **`maxCols`** chronological values (left = older submissions in window).
 */
export function buildPatientScoreTimeline(
  responses: FormResponse[],
  maxCols = DEFAULT_MAX_COLUMNS,
): ScoreTimelineRow[] {
  return DOCTOR_SCOREBOARD_FORM_IDS.map((formId) => {
    const subset = responses
      .filter((r) => r.form_id === formId)
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

    const tail = subset.slice(-maxCols);

    const cells: ScoreTimelineCell[] = [];
    for (const row of tail) {
      const created = String(row.created_at ?? "").trim();
      if (!created || !row.answers || typeof row.answers !== "object") continue;
      const v = summarizeFormResponseForScoreboard(
        formId,
        row.answers as Record<string, unknown>,
      );
      if (v === null) continue;
      cells.push({
        createdAtIso: created,
        dateShort: shortDateLabel(created),
        value: v,
      });
    }

    const title =
      formId === "pain_intensity_v1"
        ? "Pain intensity (PROMIS T)"
        : formId === "fatigue_v1"
          ? "Fatigue (PROMIS T)"
          : titleForForm(formId);

    return { formId, title, cells };
  }).filter((r) => r.cells.length > 0);
}

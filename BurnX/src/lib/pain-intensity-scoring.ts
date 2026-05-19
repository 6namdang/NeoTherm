/**
 * PROMIS Pain Intensity 3a v2.0 Adult Short Form (`pain_intensity_v1`): PAINQU6 / PAINQU8 /
 * PAINQU21 ({@see PAIN_INTENSITY_FORM}). Stored responses are scale option indices 0–4 per item.
 *
 * Metric scoring: PROMIS Pain Intensity Scoring Manual — HealthMeasures (June 2021 revision).
 * https://www.healthmeasures.net/images/PROMIS/manuals/Scoring_Manuals_/PROMIS_Pain_Intensity_Scoring_Manual.pdf
 *
 * Separate ordinal rollup (`painIntensityOrdinalSnapshot`) powers the dashboard average-pain
 * history modal; `scorePainIntensity` is PROMIS-only.
 */

import type { ScaleAnswers } from "../constants/forms/types";
import { bxLog } from "./debug-log";

const QUESTION_IDS = ["PAINQU6", "PAINQU8", "PAINQU21"] as const;

export type PainIntensitySeverity = "none" | "mild" | "moderate" | "severe";

export type PainIntensityScore = {
  rawScore: number | null;
  tScore: number | null;
  standardError: number | null;
  severity: PainIntensitySeverity | null;
  isComplete: boolean;
};

/** PROMIS Pain Intensity 3a v2.0 Adult Short Form — Appendix 1 conversion table */
export const RAW_TO_T_SCORE: Record<number, { readonly tScore: number; readonly se: number }> = {
  3: { tScore: 36.3, se: 5.4 },
  4: { tScore: 43.1, se: 3.9 },
  5: { tScore: 47.5, se: 3.7 },
  6: { tScore: 51.4, se: 3.8 },
  7: { tScore: 54.8, se: 3.9 },
  8: { tScore: 58.5, se: 3.9 },
  9: { tScore: 61.9, se: 3.8 },
  10: { tScore: 64.9, se: 3.9 },
  11: { tScore: 68.4, se: 4.1 },
  12: { tScore: 72.0, se: 4.2 },
  13: { tScore: 75.1, se: 4.8 },
  14: { tScore: 77.8, se: 5.0 },
  15: { tScore: 81.8, se: 4.2 },
};

export const PAIN_QUESTION_IDS = QUESTION_IDS;

export type PainIntensityDashboardSnapshot = {
  createdAtIso: string;
} & PainIntensityScore;

/** 0 = lowest categorical pain intensity, 4 = highest — per questionnaire labels. */
export type PainIntensityMeasures = {
  worst0to4: number | null;
  average0to4: number | null;
  current0to4: number | null;
  isComplete: boolean;
  meanPain0to4: number | null;
};

export type PainIntensityDashboardPoint = {
  createdAtIso: string;
} & PainIntensityMeasures;

export function severityFromTScore(t: number): PainIntensitySeverity {
  if (t < 55) return "none";
  if (t < 60) return "mild";
  if (t < 70) return "moderate";
  return "severe";
}

function emptyScore(): PainIntensityScore {
  return {
    rawScore: null,
    tScore: null,
    standardError: null,
    severity: null,
    isComplete: false,
  };
}

/** PROMIS metric: summed item values (1–5 each) → T-score / SE when all items valid (indices 0–4 each). */
export function scorePainIntensity(answers: ScaleAnswers): PainIntensityScore {
  let raw = 0;
  for (const id of QUESTION_IDS) {
    const v = answers[id];
    if (typeof v !== "number" || v < 0 || v > 4 || !Number.isFinite(v)) {
      return emptyScore();
    }
    raw += Math.trunc(v) + 1;
  }

  const entry = RAW_TO_T_SCORE[raw];
  if (!entry) {
    bxLog("painIntensity", "RAW_TO_T_SCORE miss (unexpected)", { rawScore: raw });
    return emptyScore();
  }

  return {
    rawScore: raw,
    tScore: entry.tScore,
    standardError: entry.se,
    severity: severityFromTScore(entry.tScore),
    isComplete: true,
  };
}

function clipPainIndex(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  if (n < 0 || n > 4) return null;
  return n;
}

/** Ordinal summaries for history UI (gradient chart, etc.) — unchanged shape from pre-PROMIS helper. */
export function painIntensityOrdinalSnapshot(answers: ScaleAnswers): PainIntensityMeasures {
  const w = clipPainIndex(answers.PAINQU6);
  const a = clipPainIndex(answers.PAINQU8);
  const c = clipPainIndex(answers.PAINQU21);
  const isComplete = w !== null && a !== null && c !== null;
  const meanPain0to4 =
    isComplete && w !== null && a !== null && c !== null
      ? Math.round(((w + a + c) / 3) * 10) / 10
      : null;

  return {
    worst0to4: w,
    average0to4: a,
    current0to4: c,
    isComplete,
    meanPain0to4,
  };
}

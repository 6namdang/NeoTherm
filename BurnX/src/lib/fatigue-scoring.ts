/**
 * PROMIS Fatigue 7a v1.0 — adult short-form scoring (raw sum → T-score + SE).
 *
 * Source: HealthMeasures PROMIS Fatigue User Manual and Scoring Instructions
 * https://www.healthmeasures.net/images/PROMIS/manuals/Scoring_Manual_Only/PROMIS_Fatigue_User_Manual_and_Scoring_Instructions_05Dec2023.pdf
 * — Appendix 1, “Fatigue 7a - Adult v1.0” conversion table.
 *
 * Item 7 (energy / exercise) is reverse-scored on the fatigue metric: contribution = 5 − index
 * (option index 0…4); items 1–6 use index + 1.
 */

import type { ScaleAnswers } from "../constants/forms/types";

export type FatigueSeverity = "none" | "mild" | "moderate" | "severe";

export type FatigueScore = {
  rawScore: number | null;
  tScore: number | null;
  standardError: number | null;
  severity: FatigueSeverity | null;
  isComplete: boolean;
};

export type FatigueDashboardSnapshot = {
  createdAtIso: string;
} & FatigueScore;

/** One scored fatigue submission (used for history charts). */
export type FatigueDashboardPoint = FatigueDashboardSnapshot;

export const REGULAR_QUESTION_IDS = [
  "fatigue_1",
  "fatigue_2",
  "fatigue_3",
  "fatigue_4",
  "fatigue_5",
  "fatigue_6",
] as const;

export const REVERSE_QUESTION_ID = "fatigue_7" as const;

/** PROMIS Fatigue 7a v1.0 adult: raw summed score → metric. */
export const RAW_TO_T_SCORE: Record<
  number,
  { readonly tScore: number; readonly se: number }
> = {
  7: { tScore: 29.4, se: 5.3 },
  8: { tScore: 33.4, se: 4.8 },
  9: { tScore: 36.9, se: 4.3 },
  10: { tScore: 39.6, se: 4.0 },
  11: { tScore: 41.9, se: 3.8 },
  12: { tScore: 43.9, se: 3.5 },
  13: { tScore: 45.8, se: 3.3 },
  14: { tScore: 47.6, se: 3.2 },
  15: { tScore: 49.2, se: 3.1 },
  16: { tScore: 50.8, se: 3.0 },
  17: { tScore: 52.2, se: 3.0 },
  18: { tScore: 53.7, se: 3.0 },
  19: { tScore: 55.1, se: 3.0 },
  20: { tScore: 56.4, se: 2.9 },
  21: { tScore: 57.8, se: 2.9 },
  22: { tScore: 59.2, se: 2.9 },
  23: { tScore: 60.6, se: 2.9 },
  24: { tScore: 62.0, se: 2.9 },
  25: { tScore: 63.4, se: 2.9 },
  26: { tScore: 64.8, se: 2.9 },
  27: { tScore: 66.3, se: 2.9 },
  28: { tScore: 67.8, se: 2.9 },
  29: { tScore: 69.4, se: 2.9 },
  30: { tScore: 71.1, se: 3.0 },
  31: { tScore: 72.9, se: 3.0 },
  32: { tScore: 74.8, se: 3.1 },
  33: { tScore: 77.1, se: 3.3 },
  34: { tScore: 79.8, se: 3.6 },
  35: { tScore: 83.2, se: 4.1 },
};

function emptyScore(): FatigueScore {
  return {
    rawScore: null,
    tScore: null,
    standardError: null,
    severity: null,
    isComplete: false,
  };
}

/** Clinical-style bands on the T-score metric (higher = more fatigue). */
export function severityFromTScore(t: number): FatigueSeverity {
  if (t < 55) return "none";
  if (t < 60) return "mild";
  if (t < 70) return "moderate";
  return "severe";
}

function clipOptIndex(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  if (n < 0 || n > 4) return null;
  return n;
}

export function scoreFatigue(answers: ScaleAnswers): FatigueScore {
  let rawSum = 0;

  for (const id of REGULAR_QUESTION_IDS) {
    const idx = clipOptIndex(answers[id]);
    if (idx === null) return emptyScore();
    rawSum += idx + 1;
  }

  const rev = clipOptIndex(answers[REVERSE_QUESTION_ID]);
  if (rev === null) return emptyScore();
  rawSum += 5 - rev;

  const rawScore = rawSum;
  const entry = RAW_TO_T_SCORE[rawScore];
  if (!entry) {
    return {
      rawScore,
      tScore: null,
      standardError: null,
      severity: null,
      isComplete: false,
    };
  }

  return {
    rawScore,
    tScore: entry.tScore,
    standardError: entry.se,
    severity: severityFromTScore(entry.tScore),
    isComplete: true,
  };
}

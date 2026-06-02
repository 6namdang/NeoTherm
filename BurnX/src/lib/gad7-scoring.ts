/**
 * GAD-7 sum score (standard 7 items × 0–3). Interpretation aligns with widespread clinical cut-points.
 */

import type { ScaleAnswers } from "../constants/forms/types";

export type Gad7Severity = "minimal" | "mild" | "moderate" | "severe";

export const GAD7_QUESTION_IDS = [
  "gad7_1",
  "gad7_2",
  "gad7_3",
  "gad7_4",
  "gad7_5",
  "gad7_6",
  "gad7_7",
] as const;

export const GAD7_TOTAL_MAX = 21;

export type Gad7ScoreResult = {
  total: number | null;
  isComplete: boolean;
  severity: Gad7Severity | null;
};

function clipLikert4(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  if (n < 0 || n > 3) return null;
  return n;
}

/** Standard cut-offs: minimal 0–4, mild 5–9, moderate 10–14, severe ≥15. */
export function gad7SeverityFromTotal(total: number): Gad7Severity {
  if (total <= 4) return "minimal";
  if (total <= 9) return "mild";
  if (total <= 14) return "moderate";
  return "severe";
}

export function scoreGad7(answers: ScaleAnswers): Gad7ScoreResult {
  let sum = 0;
  for (const id of GAD7_QUESTION_IDS) {
    const idx = clipLikert4(answers[id]);
    if (idx === null) {
      return { total: null, isComplete: false, severity: null };
    }
    sum += idx;
  }
  return {
    total: sum,
    isComplete: true,
    severity: gad7SeverityFromTotal(sum),
  };
}

export type Gad7DashboardSnapshot = {
  createdAtIso: string;
} & Gad7ScoreResult;

export type Gad7DashboardPoint = Gad7DashboardSnapshot;

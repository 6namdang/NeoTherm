/**
 * Cognitive symptom screen — four PROM-style frequency items × 0–4 (never → very often).
 * Total burden 0–16; higher implies more cognitive symptom burden in this window (orientation only).
 */

import type { ScaleAnswers } from "../constants/forms/types";

export type CognitiveBurdenSeverity = "low" | "mild" | "moderate" | "high";

export const COGNITIVE_QUESTION_IDS = [
  "cognitive_1",
  "cognitive_2",
  "cognitive_3",
  "cognitive_4",
] as const;

/** Four items × five-point frequency (0–4). */
export const COGNITIVE_TOTAL_MAX = 16;

export type CognitiveScoreResult = {
  total: number | null;
  isComplete: boolean;
  severity: CognitiveBurdenSeverity | null;
};

function clipLikert5(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  if (n < 0 || n > 4) return null;
  return n;
}

export function cognitiveSeverityFromTotal(total: number): CognitiveBurdenSeverity {
  if (total <= 4) return "low";
  if (total <= 8) return "mild";
  if (total <= 12) return "moderate";
  return "high";
}

export function scoreCognitiveFunction(
  answers: ScaleAnswers,
): CognitiveScoreResult {
  let sum = 0;
  for (const id of COGNITIVE_QUESTION_IDS) {
    const idx = clipLikert5(answers[id]);
    if (idx === null) {
      return { total: null, isComplete: false, severity: null };
    }
    sum += idx;
  }
  return {
    total: sum,
    isComplete: true,
    severity: cognitiveSeverityFromTotal(sum),
  };
}

export type CognitiveDashboardSnapshot = {
  createdAtIso: string;
} & CognitiveScoreResult;

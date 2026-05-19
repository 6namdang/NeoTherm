/**
 * On-device LIBRE domain summaries — reverse coding aligned with burnAI
 * `QuestionBankManager.reverseScored` (see burnAI-ios). T-score shape matches
 * `LIBRELocalSummaryEngine`: norm 0–4 → 20 + clampedMean * 15.
 */

import { LIBRE_FORM } from "../constants/forms/libre";
import type { ScaleAnswers } from "../constants/forms/types";
import { flattenQuestions, isVisible } from "./form-engine";

/** burnAI-ios QuestionBankManager.reverseScored */
const REVERSE_SCORED_QUESTION_IDS = new Set<string>([
  "work_1",
  "work_4",
  "work_6",
  "work_9",
  "work_10",
  "romantic_9",
  "romantic_10",
  "sexual_2",
  "sexual_3",
  "sexual_4",
  "sexual_9",
  "family_2",
  "family_5",
  "family_9",
  "family_10",
  "social_int_2",
  "social_int_4",
  "social_int_5",
  "social_int_6",
  "social_int_7",
  "social_int_8",
  "social_int_9",
  "social_int_10",
  "social_act_1",
  "social_act_2",
  "social_act_5",
  "social_act_6",
  "social_act_7",
  "social_act_8",
]);

/** Radar vertex order — matches canonical LIBRE section family (relationships-first). */
export const LIBRE_RADAR_SECTION_ORDER = [
  "family_friends",
  "social_interactions",
  "social_activities",
  "work",
  "romantic",
  "sexual",
] as const;

export type LibreRadarSectionId = (typeof LIBRE_RADAR_SECTION_ORDER)[number];

const RADAR_AXIS_LABELS: Record<LibreRadarSectionId, string> = {
  family_friends: "Relationships",
  social_interactions: "Social interactions",
  social_activities: "Social activities",
  work: "Work",
  romantic: "Romantic",
  sexual: "Sexual",
};

/** Compact pill labels around chart perimeter — BravoHealth radar pattern. */
export const LIBRE_RADAR_AXIS_SHORT: Record<LibreRadarSectionId, string> = {
  family_friends: "REL",
  social_interactions: "SINT",
  social_activities: "SACT",
  work: "WRK",
  romantic: "ROM",
  sexual: "INT",
};

/** 5-point scales (excluding yes/no). */
function adjustedItemScore(questionId: string, rawIndex: number): number {
  const clipped = Math.min(4, Math.max(0, rawIndex));
  return REVERSE_SCORED_QUESTION_IDS.has(questionId) ? 4 - clipped : clipped;
}

export function coerceAnswersRecord(
  raw: Record<string, unknown> | undefined,
): ScaleAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const out: ScaleAnswers = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.trunc(v);
      continue;
    }
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = Math.trunc(n);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function sectionIdForQuestionId(questionId: string): LibreRadarSectionId | null {
  for (const s of LIBRE_FORM.sections) {
    const sid = s.id as LibreRadarSectionId;
    if (!LIBRE_RADAR_SECTION_ORDER.includes(sid)) continue;
    if (s.questions.some((q) => q.id === questionId)) return sid;
  }
  return null;
}

export type LibreRadarDomainSlice = {
  sectionId: LibreRadarSectionId;
  label: string;
  /** Approximate PROM t-score (~20–80), or null if section not scorable from stored answers */
  tScore: number | null;
  /** 0–6 filled concentric tiers from centre (sectional radar) */
  filledBands: number;
};

export type LibreRadarResult = {
  domains: LibreRadarDomainSlice[];
  /** Mean of domains with non-null tScore; null if none */
  overallTScore: number | null;
};

/** One scorable LIBRE submission for dashboard/modal paging (newest-first array). */
export type LibreDashboardSubmissionSnapshot = {
  createdAtIso: string;
  domains: LibreRadarDomainSlice[];
  overallTScore: number | null;
};

/**
 * Computes per-domain approximate t-scores from one LIBRE submission’s answer map.
 */
export function computeLibreRadarScores(answers: ScaleAnswers): LibreRadarResult {
  const aggregates: Record<
    LibreRadarSectionId,
    { sum: number; n: number }
  > = {
    family_friends: { sum: 0, n: 0 },
    social_interactions: { sum: 0, n: 0 },
    social_activities: { sum: 0, n: 0 },
    work: { sum: 0, n: 0 },
    romantic: { sum: 0, n: 0 },
    sexual: { sum: 0, n: 0 },
  };

  const flat = flattenQuestions(LIBRE_FORM);

  for (const q of flat) {
    const sectionKey = sectionIdForQuestionId(q.id);
    if (sectionKey === null) continue;
    if (!isVisible(q, answers)) continue;
    if (q.scaleId === "yesno") continue;

    const raw = answers[q.id];
    if (raw === undefined) continue;

    const adj = adjustedItemScore(q.id, raw);
    aggregates[sectionKey].sum += adj;
    aggregates[sectionKey].n += 1;
  }

  const domains: LibreRadarDomainSlice[] = [];

  let overallSum = 0;
  let overallN = 0;

  for (const sectionId of LIBRE_RADAR_SECTION_ORDER) {
    const { sum, n } = aggregates[sectionId];
    const label = RADAR_AXIS_LABELS[sectionId];

    if (n <= 0) {
      domains.push({
        sectionId,
        label,
        tScore: null,
        filledBands: 0,
      });
      continue;
    }

    const normMean = sum / n;
    const clamped = Math.min(4, Math.max(0, normMean));
    const tScore = 20 + clamped * 15;
    const filledBands = Math.min(
      6,
      Math.max(0, Math.round(((tScore - 20) / 60) * 6)),
    );

    domains.push({
      sectionId,
      label,
      tScore,
      filledBands,
    });
    overallSum += tScore;
    overallN += 1;
  }

  const overallTScore =
    overallN > 0 ? Math.round((overallSum / overallN) * 10) / 10 : null;

  return { domains, overallTScore };
}

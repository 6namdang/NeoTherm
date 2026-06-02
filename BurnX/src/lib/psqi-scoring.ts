/**
 * Pittsburgh Sleep Quality Index (PSQI) — component + global scores derived from NeoTherm
 * `psqi_v1` answer keys ({@see PSQI_FORM}). Mirrors publication scoring logic (Buysse et al.);
 * categorical Q1–Q4 buckets are mapped to midpoints consistent with ordinal capture.
 */

import type { ScaleAnswers } from "../constants/forms/types";

export const PSQI_DOMAIN_ORDER = [
  "durat",
  "distb",
  "laten",
  "daydys",
  "hse",
  "sq",
  "meds",
] as const;

export type PsqiDomainId = (typeof PSQI_DOMAIN_ORDER)[number];

export type PsqiDomainSlice = {
  id: PsqiDomainId;
  /** Short UX label */
  label: string;
  /** Published component score 0 (best) – 3 (worst) unless incomplete */
  score: number | null;
  maxScore: 3;
};

export type PsqiScoreResult = {
  /** Publication total 0 (best) – 21 (worst) when complete */
  total: number | null;
  domainById: Record<PsqiDomainId, PsqiDomainSlice>;
  /** True only when Questions 1–9 are answered with valid indices */
  isComplete: boolean;
  missingKeys: string[];
  /** Estimated actual sleep hours from PSQI question 4. */
  sleepHours: number | null;
};

/** Published PSQI component names (for dashboards, tooltips, and education). */
export const PSQI_DOMAIN_LABELS: Record<PsqiDomainId, string> = {
  durat: "Sleep duration",
  distb: "Sleep disturbance",
  laten: "Sleep latency",
  daydys: "Daytime dysfunction",
  hse: "Sleep efficiency",
  sq: "Subjective sleep quality",
  meds: "Sleep medications",
};

const REQUIRED_Q1_Q9_IDS = [
  "psqi_1_bed_time",
  "psqi_2_sleep_latency",
  "psqi_3_wakeup_time",
  "psqi_4_sleep_hours",
  "psqi_5a_sleep_30min",
  "psqi_5b_wake_night",
  "psqi_5c_bathroom",
  "psqi_5d_breathe",
  "psqi_5e_cough_snore",
  "psqi_5f_cold",
  "psqi_5g_hot",
  "psqi_5h_dreams",
  "psqi_5i_pain",
  "psqi_5j_other_reason",
  "psqi_6_sleep_quality",
  "psqi_7_sleep_medicine",
  "psqi_8_staying_awake",
  "psqi_9_enthusiasm",
];

/** Mid-point bed time minutes from midnight — maps ordinal Q1 bedtime bins to TIB. */
const PSQI_Q1_BED_MINUTES_MIDNIGHT = [
  Math.round((20 + 42 / 60) * 60), // before 9 PM
  Math.round((21 + 30 / 60) * 60), // 9–11 PM
  Math.round((0 + 15 / 60) * 60), // 11 PM–12:59 AM → ~00:15 (next calendar day semantics below)
  Math.round((1 + 45 / 60) * 60), // 1 AM or later
] as const;

/** Mid-point wake minutes from midnight — Q3. */
const PSQI_Q3_WAKE_MINUTES_MIDNIGHT = [
  Math.round((4 + 15 / 60) * 60), // before 5 AM
  Math.round((6 + 30 / 60) * 60), // 5–7 AM
  Math.round((7 + 30 / 60) * 60), // 7–9 AM (mid of range)
  Math.round((9 + 30 / 60) * 60), // 9 AM+
] as const;

/** Hours of actual sleep (Q4) — ordinal → numeric midpoint for efficiency. */
const PSQI_Q4_SLEEP_HOURS_MIDPOINT = [
  /* more than 7 h */ 7.75,
  /* 6–7 h */ 6.5,
  /* 5–<6 h */ 5.5,
  /* <5 h */ 4,
] as const;

export function estimatedSleepHoursFromQ4(value: unknown): number | null {
  const q4 = clipIntAns(value, 3);
  if (q4 === undefined) return null;
  return PSQI_Q4_SLEEP_HOURS_MIDPOINT[q4 as 0 | 1 | 2 | 3] ?? null;
}

function clipIntAns(v: unknown, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.trunc(v);
  if (n < 0 || n > max) return undefined;
  return n;
}

function estimatedMinutesTimeInBed(q1: number, q3: number): number {
  const bed =
    PSQI_Q1_BED_MINUTES_MIDNIGHT[Math.min(3, Math.max(0, q1))] ?? 1290;
  const wake =
    PSQI_Q3_WAKE_MINUTES_MIDNIGHT[Math.min(3, Math.max(0, q3))] ?? 390;

  /**
   * Ordinal bucket bed times “before 9 PM” through “1 AM+” sit on a single night;
   * evening bed (≥ ~2 PM minute index) → duration spans local midnight into morning wake.
   */
  const EVENING_OR_LATE = 14 * 60;
  if (bed >= EVENING_OR_LATE) {
    return (24 * 60 - bed) + wake;
  }
  let d = wake - bed;
  if (d <= 90) d += 24 * 60;
  return Math.min(Math.max(d, 120), 20 * 60);
}

/** Q4 ordinal → Published DURAT (PSQIDURAT). */
export function duratScoreFromQ4ordinal(q4: number): number {
  if (q4 === 0) return 0; // More than 7 h
  if (q4 === 1) return 1; // 6–7
  if (q4 === 2) return 2; // 5–<6
  return 3; // Less than 5
}

/** Q2 ordinal (NeoTherm scale) matches PSQI “Q2new” latency bins. */
function q2newFromOrdinal(q2: number): number {
  return clipIntAns(q2, 3) ?? 0;
}
/** PSQILATEN — summed Q5a + Q2new categorical points, canonical cut‑points per PSQI scoring manual. */
export function latenScoreFromLatencySum(sum: number): number {
  if (sum <= 0) return 0;
  if (sum <= 2) return 1;
  if (sum <= 4) return 2;
  return 3;
}

/**
 * PSQIDAYDYS — canonical cutpoints on Q8 + Q9 (each 0–3).
 */
export function daydysScoreFromSum(sum: number): number {
  if (sum <= 0) return 0;
  if (sum <= 2) return 1;
  if (sum <= 4) return 2;
  return 3;
}

/**
 * Raw sum of disturbances for PSQIDISTB; Q5j per Buysse 2005 if comment or frequency missing → 0.
 */
export function effectiveQ5jForDisturbances(
  rawJ: number | undefined,
  extras?: Record<string, unknown>,
): number {
  if (rawJ === undefined || rawJ === null) return 0;
  const v0 = clipIntAns(rawJ, 3);
  if (v0 === undefined) return 0;
  if (v0 === 0) return 0;
  const comment =
    extras?.["psqi_5j_other_comment"] ??
    extras?.["psqi_5j_comment"] ??
    extras?.["psqi_5j_other_reason_comment"];
  const cStr =
    typeof comment === "string" ? comment.trim() : comment != null ? String(comment).trim() : "";
  if (cStr === "") return 0;
  return v0;
}

export function disturbancesScoreFromNineItemsSum(sum: number): number {
  if (sum <= 0) return 0;
  if (sum <= 9) return 1;
  if (sum <= 18) return 2;
  return 3;
}

/**
 * HSE from time in bed (Q1+Q3 midpoint) × actual sleep (Q4 midpoint).
 */
export function hseScoreFromEfficiencyPercent(pct: number): number {
  if (pct >= 85) return 0;
  if (pct >= 75) return 1;
  if (pct >= 65) return 2;
  return 3;
}

export type PsqiDashboardSubmissionSnapshot = {
  createdAtIso: string;
  sleepHours: number | null;
} & Pick<PsqiScoreResult, "total" | "domainById" | "isComplete">;

/** Global clinical band for coloring (literature cutoff PSQI ≤5 “good”). */
export function psqiClinicalBand(total: number | null): "unknown" | "good" | "moderate" | "poor" {
  if (total === null) return "unknown";
  if (total <= 5) return "good";
  if (total <= 10) return "moderate";
  return "poor";
}

function missingRequiredKeys(ans: ScaleAnswers): string[] {
  return REQUIRED_Q1_Q9_IDS.filter((id) => !(id in ans));
}

export function computePsqiScores(
  answers: ScaleAnswers,
  extras?: Record<string, unknown>,
): PsqiScoreResult | null {
  if (!answers || Object.keys(answers).length === 0) return null;
  const skip = missingRequiredKeys(answers);
  const isComplete = skip.length === 0;

  const emptySlice = (
    id: PsqiDomainId,
  ): PsqiDomainSlice => ({
    id,
    label: PSQI_DOMAIN_LABELS[id],
    score: null,
    maxScore: 3,
  });

  const emptyDomains = Object.fromEntries(
    PSQI_DOMAIN_ORDER.map((id) => [id, emptySlice(id)]),
  ) as Record<PsqiDomainId, PsqiDomainSlice>;

  if (!isComplete) {
    return {
      total: null,
      domainById: emptyDomains,
      isComplete: false,
      missingKeys: skip,
      sleepHours: null,
    };
  }

  const q1 = answers["psqi_1_bed_time"];
  const q3 = answers["psqi_3_wakeup_time"];
  const q4 = answers["psqi_4_sleep_hours"];
  const q2 = answers["psqi_2_sleep_latency"];

  if (
    clipIntAns(q1, 3) === undefined ||
    clipIntAns(q3, 3) === undefined ||
    clipIntAns(q4, 3) === undefined ||
    clipIntAns(q2, 3) === undefined
  ) {
    return {
      total: null,
      domainById: emptyDomains,
      isComplete: false,
      missingKeys: [...skip, "invalid_answer_range"],
      sleepHours: null,
    };
  }

  const durat = duratScoreFromQ4ordinal(q4 as number);

  const q5IDs = [
    "psqi_5a_sleep_30min",
    "psqi_5b_wake_night",
    "psqi_5c_bathroom",
    "psqi_5d_breathe",
    "psqi_5e_cough_snore",
    "psqi_5f_cold",
    "psqi_5g_hot",
    "psqi_5h_dreams",
    "psqi_5i_pain",
  ] as const;
  let distSum = 0;
  for (const id of q5IDs) {
    const v = clipIntAns(answers[id], 3);
    if (v === undefined) {
      return {
        total: null,
        domainById: emptyDomains,
        isComplete: false,
        missingKeys: [...skip, "invalid_answer_range"],
        sleepHours: null,
      };
    }
    distSum += v;
  }
  const rawJ = answers["psqi_5j_other_reason"];
  distSum += effectiveQ5jForDisturbances(rawJ as number | undefined, extras);
  const distb = disturbancesScoreFromNineItemsSum(distSum);

  const latenSum =
    (clipIntAns(answers["psqi_5a_sleep_30min"], 3) ?? 0) +
    q2newFromOrdinal(q2 as number);
  const laten = latenScoreFromLatencySum(latenSum);

  const q8Clip = clipIntAns(answers["psqi_8_staying_awake"], 3);
  const q9Clip = clipIntAns(answers["psqi_9_enthusiasm"], 3);
  if (q8Clip === undefined || q9Clip === undefined) {
    return {
      total: null,
      domainById: emptyDomains,
      isComplete: false,
      missingKeys: [...skip, "invalid_answer_range"],
      sleepHours: null,
    };
  }
  const sum89 = q8Clip + q9Clip;
  const daydys = daydysScoreFromSum(sum89);

  const tibMinutes = estimatedMinutesTimeInBed(q1 as number, q3 as number);
  const tibHours = tibMinutes / 60;
  const sleepMid = PSQI_Q4_SLEEP_HOURS_MIDPOINT[q4 as 0 | 1 | 2 | 3] ?? 6;
  const effPct =
    tibHours > 0 ? (sleepMid / Math.max(tibHours, 0.0001)) * 100 : 0;
  const hse = hseScoreFromEfficiencyPercent(effPct);

  const sqClip = clipIntAns(answers["psqi_6_sleep_quality"], 3);
  const medsClip = clipIntAns(answers["psqi_7_sleep_medicine"], 3);
  if (sqClip === undefined || medsClip === undefined) {
    return {
      total: null,
      domainById: emptyDomains,
      isComplete: false,
      missingKeys: [...skip, "invalid_answer_range"],
      sleepHours: null,
    };
  }

  const sq = sqClip;
  const meds = medsClip;

  const slices: Record<PsqiDomainId, PsqiDomainSlice> = {
    durat: { id: "durat", label: PSQI_DOMAIN_LABELS.durat, score: durat, maxScore: 3 },
    distb: { id: "distb", label: PSQI_DOMAIN_LABELS.distb, score: distb, maxScore: 3 },
    laten: { id: "laten", label: PSQI_DOMAIN_LABELS.laten, score: laten, maxScore: 3 },
    daydys: { id: "daydys", label: PSQI_DOMAIN_LABELS.daydys, score: daydys, maxScore: 3 },
    hse: { id: "hse", label: PSQI_DOMAIN_LABELS.hse, score: hse, maxScore: 3 },
    sq: { id: "sq", label: PSQI_DOMAIN_LABELS.sq, score: sq, maxScore: 3 },
    meds: { id: "meds", label: PSQI_DOMAIN_LABELS.meds, score: meds, maxScore: 3 },
  };

  const total =
    durat + distb + laten + daydys + hse + sq + meds;

  return {
    total,
    domainById: slices,
    isComplete: true,
    missingKeys: [],
    sleepHours: estimatedSleepHoursFromQ4(q4),
  };
}

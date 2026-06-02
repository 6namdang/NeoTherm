import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "../constants/ema-form-ids";
import type { EmaLikertPolarity } from "./ema-likert-gradient";

/** Verbal anchors for EMA 0–10 visual analog scales (11 points). */
export const EMA_PAIN_VAS_11_LABELS = [
  "0 - No pain",
  "1 - Very mild pain",
  "2 - Mild pain",
  "3 - Uncomfortable pain",
  "4 - Moderate pain",
  "5 - Distressing pain",
  "6 - Very distressing pain",
  "7 - Intense pain",
  "8 - Very intense pain",
  "9 - Excruciating pain",
  "10 - Worst pain imaginable",
] as const;

/** 0 = worst sleep, 10 = best sleep. */
export const EMA_SLEEP_VAS_11_LABELS = [
  "0 - Worst sleep",
  "1 - Very poor sleep",
  "2 - Poor sleep",
  "3 - Restless sleep",
  "4 - Below average sleep",
  "5 - Average sleep",
  "6 - Somewhat restful sleep",
  "7 - Good sleep",
  "8 - Very good sleep",
  "9 - Excellent sleep",
  "10 - Best sleep",
] as const;

/** 0 = worst mood, 10 = best mood. */
export const EMA_MOOD_VAS_11_LABELS = [
  "0 - Worst possible mood",
  "1 - Very low mood",
  "2 - Low mood",
  "3 - Somewhat low mood",
  "4 - Below average mood",
  "5 - Neutral mood",
  "6 - Somewhat positive mood",
  "7 - Good mood",
  "8 - Very good mood",
  "9 - Excellent mood",
  "10 - Best possible mood",
] as const;

export type EmaVasFormConfig = {
  formId: string;
  labels: readonly string[];
  polarity: EmaLikertPolarity;
};

const EMA_VAS_CONFIG: Record<string, EmaVasFormConfig> = {
  [EMA_SLEEP_FORM_ID]: {
    formId: EMA_SLEEP_FORM_ID,
    labels: EMA_SLEEP_VAS_11_LABELS,
    polarity: "higherIsBetter",
  },
  [EMA_PAIN_FORM_ID]: {
    formId: EMA_PAIN_FORM_ID,
    labels: EMA_PAIN_VAS_11_LABELS,
    polarity: "lowerIsBetter",
  },
  [EMA_MOOD_FORM_ID]: {
    formId: EMA_MOOD_FORM_ID,
    labels: EMA_MOOD_VAS_11_LABELS,
    polarity: "higherIsBetter",
  },
};

export function getEmaVasConfig(formId: string): EmaVasFormConfig | null {
  return EMA_VAS_CONFIG[formId] ?? null;
}

/** Scale labels for questionnaire definitions (`scales.*.labels`). */
export function emaScaleLabels(formId: string): readonly string[] {
  const config = getEmaVasConfig(formId);
  if (!config) {
    throw new Error(`Unknown EMA form id: ${formId}`);
  }
  return config.labels;
}

export function emaLikertPolarityForForm(formId: string): EmaLikertPolarity {
  return getEmaVasConfig(formId)?.polarity ?? "higherIsBetter";
}

/** Endpoint text for slider rails (strips `N - ` prefix). */
export function emaEndpointDescriptor(
  labels: readonly string[],
  index: number,
  fallback: string,
): string {
  const raw = labels[index]?.trim() ?? "";
  if (raw === "") return fallback;
  const dash = raw.indexOf(" - ");
  return dash >= 0 ? raw.slice(dash + 3).trim() : raw;
}

/** Verbal descriptor for the selected score (no numeric prefix). */
export function emaVerbalDescriptor(
  labels: readonly string[],
  index: number,
): string {
  const raw = labels[index]?.trim() ?? "";
  if (raw === "") return "";
  const dash = raw.indexOf(" - ");
  if (dash >= 0) return raw.slice(dash + 3).trim();
  if (/^\d+$/.test(raw)) return "";
  return raw;
}

export function emaAccessibilitySummary(
  labels: readonly string[],
  index: number | null,
): string {
  if (index === null) return "Drag the slider to rate";
  return `${index}, ${labels[index]?.trim() ?? ""}`;
}

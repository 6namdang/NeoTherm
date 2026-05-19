import { EMA_MOOD_FORM } from "./forms/mood-everyday";
import { EMA_PAIN_NOW_FORM } from "./forms/pain-everyday";
import { EMA_SLEEP_QUALITY_FORM } from "./forms/sleep-everyday";
import type { ScaleQuestionnaireForm } from "./forms/types";

export const EMA_SLEEP_FORM_ID = "ema_sleep_quality_v1";
export const EMA_PAIN_FORM_ID = "ema_pain_now_v1";
export const EMA_MOOD_FORM_ID = "ema_mood_v1";

/** Display / notification ordering: morning sleep, then evening pair. */
export const ALL_EMA_FORMS: readonly ScaleQuestionnaireForm[] = [
  EMA_SLEEP_QUALITY_FORM,
  EMA_PAIN_NOW_FORM,
  EMA_MOOD_FORM,
];

export function isEmaFormId(formId: string): boolean {
  return formId.startsWith("ema_");
}

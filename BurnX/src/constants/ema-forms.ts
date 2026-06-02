import { EMA_MOOD_FORM } from "./forms/mood-everyday";
import { EMA_PAIN_NOW_FORM } from "./forms/pain-everyday";
import { EMA_SLEEP_QUALITY_FORM } from "./forms/sleep-everyday";
import type { ScaleQuestionnaireForm } from "./forms/types";

export {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "./ema-form-ids";

/** Display / notification ordering: sleep, pain, mood. */
export const ALL_EMA_FORMS: readonly ScaleQuestionnaireForm[] = [
  EMA_SLEEP_QUALITY_FORM,
  EMA_PAIN_NOW_FORM,
  EMA_MOOD_FORM,
];

export function isEmaFormId(formId: string): boolean {
  return formId.startsWith("ema_");
}

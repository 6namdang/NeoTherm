/** Stable EMA instrument ids — leaf module (no form-definition imports). */
export const EMA_SLEEP_FORM_ID = "ema_sleep_quality_v1";
export const EMA_PAIN_FORM_ID = "ema_pain_now_v1";
export const EMA_MOOD_FORM_ID = "ema_mood_v1";

export const EMA_FORM_IDS = [
  EMA_SLEEP_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_MOOD_FORM_ID,
] as const;

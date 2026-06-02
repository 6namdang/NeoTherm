/**
 * GET /form-schedule — five single-form EMA slots per calendar day (patient local time).
 *
 * | slot_id     | form_ids              | open  | close |
 * |-------------|-----------------------|-------|-------|
 * | sleep_am    | ema_sleep_quality_v1  | 09:00 | 23:59 |
 * | pain_am     | ema_pain_now_v1       | 11:00 | 23:59 |
 * | pain_pm     | ema_pain_now_v1       | 20:00 | 23:59 |
 * | mood_noon   | ema_mood_v1           | 12:00 | 23:59 |
 * | mood_night  | ema_mood_v1           | 22:00 | 23:59 |
 */
export type FormScheduleSlot = {
  slot_id: string;
  form_ids: string[];
  local_open_time: string;
  local_close_time: string;
  /** Fire time for the single “EMA is open” local notification. */
  n1_utc: string;
  /** Legacy triple-strike fields — ignored by the client. */
  n2_utc?: string;
  n3_utc?: string;
};

export type FormScheduleResponse = {
  date: string;
  slots: FormScheduleSlot[];
  /** Legacy audit reminder — ignored by the client. */
  n4_audit_utc?: string;
};

import type {
  FormScheduleResponse,
  FormScheduleSlot,
} from "./ema-schedule-types";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `YYYY-MM-DD` for the given local calendar day (device timezone). */
export function localCalendarYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Add whole local calendar days to a `YYYY-MM-DD` string (approximate UTC-safe for schedule ids). */
export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, da] = ymd.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, da ?? 1, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  return localCalendarYmd(dt);
}

function localUtcIsoForYmdClock(ymd: string, hour: number, minute: number): string {
  const [y, m, da] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, da ?? 1, hour, minute, 0, 0).toISOString();
}

function slot(
  dateYmd: string,
  slot_id: string,
  form_ids: string[],
  openHour: number,
  openMinute: number,
): FormScheduleSlot {
  return {
    slot_id,
    form_ids,
    local_open_time: `${pad2(openHour)}:${pad2(openMinute)}`,
    local_close_time: "23:59",
    n1_utc: localUtcIsoForYmdClock(dateYmd, openHour, openMinute),
  };
}

/**
 * When GET /form-schedule fails, approximate per-form EMA slots (mirrors backend intent):
 * sleep 9am; pain 11am + 8pm; mood 12pm + 10pm — all close 23:59 local.
 */
export function buildFallbackFormSchedule(dateYmd: string): FormScheduleResponse {
  return {
    date: dateYmd,
    slots: [
      slot(dateYmd, "sleep_am", ["ema_sleep_quality_v1"], 9, 0),
      slot(dateYmd, "pain_am", ["ema_pain_now_v1"], 11, 0),
      slot(dateYmd, "pain_pm", ["ema_pain_now_v1"], 20, 0),
      slot(dateYmd, "mood_noon", ["ema_mood_v1"], 12, 0),
      slot(dateYmd, "mood_night", ["ema_mood_v1"], 22, 0),
    ],
  };
}

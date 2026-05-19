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

/**
 * When GET /form-schedule fails, approximate grouped slots (mirrors backend intent:
 * morning sleep, evening pain+mood).
 */
export function buildFallbackFormSchedule(dateYmd: string): FormScheduleResponse {
  const morning: FormScheduleSlot = {
    slot_id: "morning_slot",
    form_ids: ["ema_sleep_quality_v1"],
    local_open_time: "06:30",
    local_close_time: "12:00",
    n1_utc: localUtcIsoForYmdClock(dateYmd, 7, 30),
    n2_utc: localUtcIsoForYmdClock(dateYmd, 9, 0),
    n3_utc: localUtcIsoForYmdClock(dateYmd, 10, 30),
  };
  const evening: FormScheduleSlot = {
    slot_id: "evening_slot",
    form_ids: ["ema_pain_now_v1", "ema_mood_v1"],
    local_open_time: "17:00",
    local_close_time: "22:30",
    n1_utc: localUtcIsoForYmdClock(dateYmd, 18, 0),
    n2_utc: localUtcIsoForYmdClock(dateYmd, 19, 30),
    n3_utc: localUtcIsoForYmdClock(dateYmd, 21, 0),
  };

  return {
    date: dateYmd,
    slots: [morning, evening],
    n4_audit_utc: localUtcIsoForYmdClock(dateYmd, 21, 45),
  };
}

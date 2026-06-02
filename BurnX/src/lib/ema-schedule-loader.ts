import { getFormSchedule } from "./api";
import { bxLog } from "./debug-log";
import {
  buildFallbackFormSchedule,
  localCalendarYmd,
} from "./ema-schedule-fallback";
import {
  isCanonicalFiveSlotSchedule,
  normalizeFormSchedule,
} from "./ema-schedule-normalize";
import type { FormScheduleResponse, FormScheduleSlot } from "./ema-schedule-types";
import { getSubjectFromStoredIdToken } from "./jwt";

type ScheduleCacheEntry = {
  sub: string | null;
  ymd: string;
  tzOffsetMin: number;
  data: FormScheduleResponse;
};

let scheduleCache: ScheduleCacheEntry | null = null;

export function clearEmaScheduleCache(): void {
  scheduleCache = null;
}

/** Fetch and normalize schedule for a calendar day (cached for today only, scoped by user + tz). */
export async function fetchFormScheduleForDate(
  ymd: string,
): Promise<FormScheduleResponse> {
  const todayYmd = localCalendarYmd();
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const sub = await getSubjectFromStoredIdToken();

  if (
    ymd === todayYmd &&
    scheduleCache?.ymd === ymd &&
    scheduleCache.tzOffsetMin === tzOffsetMin &&
    scheduleCache.sub === sub
  ) {
    return scheduleCache.data;
  }

  let data: FormScheduleResponse;
  try {
    const apiBody = await getFormSchedule({ date: ymd, tz_offset_min: tzOffsetMin });
    data = normalizeFormSchedule(ymd, apiBody);
    if (!isCanonicalFiveSlotSchedule(apiBody)) {
      bxLog("ema-schedule", "Using client fallback slots (API not canonical)", {
        requestedYmd: ymd,
        apiDate: apiBody.date,
        slotCount: apiBody.slots.length,
        slotIds: apiBody.slots.map((s: FormScheduleSlot) => s.slot_id),
      });
    }
  } catch {
    data = buildFallbackFormSchedule(ymd);
  }

  if (ymd === todayYmd) {
    scheduleCache = { sub, ymd, tzOffsetMin, data };
  }
  return data;
}

export async function getTodayFormSchedule(): Promise<FormScheduleResponse> {
  return fetchFormScheduleForDate(localCalendarYmd());
}

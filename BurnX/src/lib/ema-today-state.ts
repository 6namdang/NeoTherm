import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "../constants/ema-forms";
import { getBurnInjuryDate } from "./burn-date";
import {
  clearEmaScheduleCache,
  fetchFormScheduleForDate,
} from "./ema-schedule-loader";
import { localCalendarYmd } from "./ema-schedule-fallback";
import type { FormScheduleResponse, FormScheduleSlot } from "./ema-schedule-types";
import {
  fetchRecentCompletionIsos,
  hasFormCompletionInSlotWindow,
  windowBoundsMs,
} from "./ema-slot-windows";
import { getSubjectFromStoredIdToken } from "./jwt";

export const ALL_EMA_FORM_IDS = [
  EMA_SLEEP_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_MOOD_FORM_ID,
] as const;

export type TodayEmaState = {
  ymd: string;
  tzOffsetMin: number;
  sub: string | null;
  schedule: FormScheduleResponse;
  recentIsosByFormId: Readonly<Record<string, readonly string[]>>;
  injuryDate: string | null;
};

let cached: TodayEmaState | null = null;
let inflight: Promise<TodayEmaState> | null = null;

/** Clears shared today EMA state and the schedule loader cache. */
export function clearEmaTodayState(): void {
  cached = null;
  inflight = null;
  clearEmaScheduleCache();
}

function isNowInsideSlot(
  nowMs: number,
  schedDate: string,
  slot: FormScheduleSlot,
): boolean {
  const wb = windowBoundsMs(
    schedDate,
    slot.local_open_time,
    slot.local_close_time,
  );
  if (!wb) return false;
  return nowMs >= wb.openMs && nowMs < wb.closeMs;
}

export function resolveEmaPendingFromState(
  formId: string,
  state: TodayEmaState,
  nowMs: number = Date.now(),
): boolean {
  const slots = state.schedule.slots.filter((s) => s.form_ids.includes(formId));
  if (slots.length === 0) return false;

  const recentIsos = state.recentIsosByFormId[formId] ?? [];

  for (const slot of slots) {
    if (!isNowInsideSlot(nowMs, state.ymd, slot)) continue;
    const done = hasFormCompletionInSlotWindow(
      formId,
      state.ymd,
      slot.local_open_time,
      slot.local_close_time,
      recentIsos,
    );
    if (!done) return true;
  }

  return false;
}

export function emaAnyPendingFromState(
  state: TodayEmaState,
  nowMs: number = Date.now(),
): boolean {
  return ALL_EMA_FORM_IDS.some((id) =>
    resolveEmaPendingFromState(id, state, nowMs),
  );
}

export function slotSatisfiedFromState(
  slot: FormScheduleSlot,
  schedDateYmd: string,
  state: TodayEmaState,
): boolean {
  const formId = slot.form_ids[0];
  if (!formId) return false;
  const recentIsos = state.recentIsosByFormId[formId] ?? [];
  return hasFormCompletionInSlotWindow(
    formId,
    schedDateYmd,
    slot.local_open_time,
    slot.local_close_time,
    recentIsos,
  );
}

async function buildTodayEmaState(nowMs: number): Promise<TodayEmaState> {
  const ymd = localCalendarYmd(new Date(nowMs));
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const sub = await getSubjectFromStoredIdToken();

  const [schedule, injuryDate, sleepIsos, painIsos, moodIsos] =
    await Promise.all([
      fetchFormScheduleForDate(ymd),
      getBurnInjuryDate(),
      fetchRecentCompletionIsos(EMA_SLEEP_FORM_ID),
      fetchRecentCompletionIsos(EMA_PAIN_FORM_ID),
      fetchRecentCompletionIsos(EMA_MOOD_FORM_ID),
    ]);

  const state: TodayEmaState = {
    ymd,
    tzOffsetMin,
    sub,
    schedule,
    recentIsosByFormId: {
      [EMA_SLEEP_FORM_ID]: sleepIsos,
      [EMA_PAIN_FORM_ID]: painIsos,
      [EMA_MOOD_FORM_ID]: moodIsos,
    },
    injuryDate,
  };

  cached = state;
  return state;
}

/**
 * Shared in-memory EMA state for today — dedupes schedule + completion GETs across
 * home dashboard, notifications, assignments, and bootstrap toast.
 */
export async function loadTodayEmaState(options?: {
  nowMs?: number;
  force?: boolean;
}): Promise<TodayEmaState> {
  const nowMs = options?.nowMs ?? Date.now();
  const force = options?.force ?? false;

  if (force) {
    clearEmaTodayState();
  } else {
    const ymd = localCalendarYmd(new Date(nowMs));
    const tzOffsetMin = -new Date().getTimezoneOffset();
    const sub = await getSubjectFromStoredIdToken();
    if (
      cached &&
      cached.ymd === ymd &&
      cached.tzOffsetMin === tzOffsetMin &&
      cached.sub === sub
    ) {
      return cached;
    }
  }

  if (!inflight) {
    inflight = buildTodayEmaState(nowMs).finally(() => {
      inflight = null;
    });
  }

  return inflight;
}

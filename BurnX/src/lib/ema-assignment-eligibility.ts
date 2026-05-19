import { isEmaFormId } from "../constants/ema-forms";
import { getFormSchedule } from "./api";
import { getBurnInjuryDate, getLastCompletion } from "./burn-date";
import { buildFallbackFormSchedule, localCalendarYmd } from "./ema-schedule-fallback";
import type { AssignmentSnapshot } from "./form-assignment-eligibility";
import type { FormScheduleResponse } from "./ema-schedule-types";

let scheduleCache: { ymd: string; data: FormScheduleResponse } | null = null;

export function clearEmaScheduleCache(): void {
  scheduleCache = null;
}

export async function getTodayFormSchedule(): Promise<FormScheduleResponse> {
  const ymd = localCalendarYmd();
  if (scheduleCache?.ymd === ymd) return scheduleCache.data;

  const tz = -new Date().getTimezoneOffset();
  try {
    const data = await getFormSchedule({ date: ymd, tz_offset_min: tz });
    scheduleCache = { ymd, data };
    return data;
  } catch {
    const data = buildFallbackFormSchedule(ymd);
    scheduleCache = { ymd, data };
    return data;
  }
}

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

function windowBoundsMs(
  ymd: string,
  openHm: string,
  closeHm: string,
): { openMs: number; closeMs: number } | null {
  const o = parseHm(openHm);
  const c = parseHm(closeHm);
  if (!o || !c) return null;
  const [y, M, da] = ymd.split("-").map(Number);
  return {
    openMs: new Date(y, (M ?? 1) - 1, da ?? 1, o.h, o.m, 0, 0).getTime(),
    closeMs: new Date(y, (M ?? 1) - 1, da ?? 1, c.h, c.m, 0, 0).getTime(),
  };
}

function localYmdFromIso(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return localCalendarYmd(new Date(ms));
}

/**
 * Pending = now inside today's slot window for **`/form-schedule` `date`** AND no **`form-responses`** row for that form
 * dated that same **`sched.date`** (through **`getLastCompletion` → `GET /form-responses`**).
 *
 * **Not** sourced from **`GET /me/assignments`** Dynamo mirrors — aligns with **`syncSchedule`** / **`refreshSchedules`** kill-switch buckets.
 */
export async function resolveEmaAssignmentPending(
  formId: string,
  nowMs: number,
): Promise<boolean> {
  if (!isEmaFormId(formId)) return false;

  const sched = await getTodayFormSchedule();
  const todayYmd = localCalendarYmd(new Date(nowMs));
  if (sched.date !== todayYmd) return false;

  const slot = sched.slots.find((s) => s.form_ids.includes(formId));
  if (!slot) return false;

  const wb = windowBoundsMs(
    sched.date,
    slot.local_open_time,
    slot.local_close_time,
  );
  if (!wb) return false;
  if (nowMs < wb.openMs || nowMs >= wb.closeMs) return false;

  const last = await getLastCompletion(formId);
  if (last === null) return true;
  const lastDay = localYmdFromIso(last);
  if (lastDay === null) return true;
  return lastDay !== sched.date;
}

export async function resolveEmaAssignmentSnapshot(
  formId: string,
): Promise<AssignmentSnapshot> {
  const [injuryDate, pending, serverLast] = await Promise.all([
    getBurnInjuryDate(),
    resolveEmaAssignmentPending(formId, Date.now()),
    getLastCompletion(formId),
  ]);
  return {
    pending,
    lastCompletedAt: serverLast,
    injuryDate,
  };
}

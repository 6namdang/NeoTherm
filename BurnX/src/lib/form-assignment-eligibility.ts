import { getFormById } from "../constants/forms";
import { isEmaFormId } from "../constants/ema-forms";
import { MOCA_FORM_ID, isMocaStandaloneTestingEnabled } from "../constants/forms/moca";
import type { AssignmentDailyLocalStart } from "../constants/forms/types";
import { resolveEmaAssignmentSnapshot } from "./ema-assignment-eligibility";
import { getBurnInjuryDate, getLastCompletion } from "./burn-date";
import { isLongAssessmentMemberFormId } from "./care-program-form-groups";
import {
    setAssignmentLastCompletedIso,
} from "./form-assignment-cache-storage";
import { getSubjectFromStoredIdToken } from "./jwt";
import {
  getCurrentFullDayWindow,
  submissionInWindow,
} from "./weekly-full-day-assignment";

const DAY_MS = 1000 * 60 * 60 * 24;

function isValidDailyLocalStart(
  d: AssignmentDailyLocalStart | undefined,
): d is AssignmentDailyLocalStart {
  return (
    !!d &&
    Number.isFinite(d.hour) &&
    Number.isFinite(d.minute) &&
    d.hour >= 0 &&
    d.hour <= 23 &&
    d.minute >= 0 &&
    d.minute <= 59
  );
}

/** Start of current local assignment period containing `nowMs` (rolls at `{hour}:{minute}` each calendar day in device TZ). */
export function getCurrentDailyPeriodStartMs(
  nowMs: number,
  hour: number,
  minute: number,
): number {
  const now = new Date(nowMs);
  const y = now.getFullYear();
  const mo = now.getMonth();
  const da = now.getDate();
  const todayStart = new Date(y, mo, da, hour, minute, 0, 0).getTime();
  if (nowMs >= todayStart) {
    return todayStart;
  }
  return new Date(y, mo, da - 1, hour, minute, 0, 0).getTime();
}

export function isDueForDailyLocalWindow(
  lastCompletedIso: string | null | undefined,
  start: AssignmentDailyLocalStart,
  nowMs: number,
): boolean {
  if (lastCompletedIso === null || lastCompletedIso === undefined) return true;
  const t = lastCompletedIso.trim();
  if (t === "") return true;
  const lastMs = Date.parse(t);
  if (!Number.isFinite(lastMs)) return true;
  const periodStart = getCurrentDailyPeriodStartMs(
    nowMs,
    start.hour,
    start.minute,
  );
  return lastMs < periodStart;
}

/**
 * Eligibility compares **device** `nowMs` to stored ISO timestamps (`created_at` or client `toISOString()`).
 *
 * BACKLOG — non-blocking: wrong device clocks can skew “due” UX; optionally align to server time
 * via API header / response and emit CloudWatch metrics on large client–server deltas.
 */

export function isDueForCadence(
  lastCompletedIso: string | null | undefined,
  cadenceDays: number,
  nowMs: number,
): boolean {
  if (cadenceDays <= 0) return true;
  if (lastCompletedIso === null || lastCompletedIso === undefined) return true;
  const t = lastCompletedIso.trim();
  if (t === "") return true;
  const lastMs = Date.parse(t);
  if (!Number.isFinite(lastMs)) return true;
  return nowMs >= lastMs + cadenceDays * DAY_MS;
}

async function persistLastCompletedCache(
  formId: string,
  serverLast: string | null,
): Promise<void> {
  const sub = await getSubjectFromStoredIdToken();
  if (!sub) return;
  await setAssignmentLastCompletedIso(sub, formId, serverLast);
}

function hasWeeklyFullDays(
  days: readonly number[] | undefined,
): days is readonly number[] {
  return Array.isArray(days) && days.length > 0;
}

/**
 * Call immediately after **`POST /form-responses`** succeeds for a recurring assignment so Assignments
 * updates without waiting for another GET round-trip (cadence, daily-local, or weekly full-day window).
 */
export async function persistAssignmentSubmissionClientTime(
  formId: string,
): Promise<void> {
  const form = getFormById(formId);
  const weeklyFullDays = form?.assignmentWeeklyFullDays;
  const hasWeeklyFull =
    hasWeeklyFullDays(weeklyFullDays) && weeklyFullDays.length > 0;
  const cadenceDays = form?.assignmentCadenceDays;
  const daily =
    form?.assignmentDailyLocalStart &&
    isValidDailyLocalStart(form.assignmentDailyLocalStart)
      ? form.assignmentDailyLocalStart
      : undefined;
  const hasCadence =
    cadenceDays !== undefined && cadenceDays > 0 && !daily && !hasWeeklyFull;
  if (!hasCadence && !daily && !hasWeeklyFull) return;
  const sub = await getSubjectFromStoredIdToken();
  if (!sub) return;
  await setAssignmentLastCompletedIso(
    sub,
    formId,
    new Date().toISOString(),
  );
}

export type AssignmentSnapshot = {
  /** True = show in Assignments list and allow opening runner (not “satisfied” yet). */
  pending: boolean;
  lastCompletedAt: string | null;
  injuryDate: string | null;
};

/**
 * One network round-trip for last completion + injury date, optional cache **write** (mirror only;
 * reads stay API-first). On fetch error, returns `{ pending: true }` so list/runner stay conservative.
 */
export async function resolveAssignmentSnapshot(
  formId: string,
): Promise<AssignmentSnapshot> {
  if (isEmaFormId(formId)) {
    try {
      return await resolveEmaAssignmentSnapshot(formId);
    } catch {
      return {
        pending: true,
        lastCompletedAt: null,
        injuryDate: null,
      };
    }
  }

  try {
    if (formId === MOCA_FORM_ID && isMocaStandaloneTestingEnabled()) {
      const [injuryDate, serverLast] = await Promise.all([
        getBurnInjuryDate(),
        getLastCompletion(formId),
      ]);
      return {
        pending: true,
        lastCompletedAt: serverLast,
        injuryDate,
      };
    }

    if (isLongAssessmentMemberFormId(formId)) {
      return {
        pending: false,
        lastCompletedAt: await getLastCompletion(formId),
        injuryDate: await getBurnInjuryDate(),
      };
    }

    const form = getFormById(formId);
    const weeklyFullDays = form?.assignmentWeeklyFullDays;
    const dailyStart = form?.assignmentDailyLocalStart;
    const cadenceDays = form?.assignmentCadenceDays;
    const daily =
      dailyStart !== undefined &&
      dailyStart !== null &&
      isValidDailyLocalStart(dailyStart)
        ? dailyStart
        : undefined;
    const [injuryDate, serverLast] = await Promise.all([
      getBurnInjuryDate(),
      getLastCompletion(formId),
    ]);

    const nowMs = Date.now();

    if (hasWeeklyFullDays(weeklyFullDays)) {
      await persistLastCompletedCache(formId, serverLast);
      const window = getCurrentFullDayWindow(nowMs, weeklyFullDays);
      if (window) {
        const recorded = submissionInWindow(
          serverLast,
          window.startMs,
          window.endMs,
        );
        return {
          pending: !recorded,
          lastCompletedAt: serverLast,
          injuryDate,
        };
      }
      return {
        pending: false,
        lastCompletedAt: serverLast,
        injuryDate,
      };
    }

    if (daily) {
      await persistLastCompletedCache(formId, serverLast);
      return {
        pending: isDueForDailyLocalWindow(serverLast, daily, nowMs),
        lastCompletedAt: serverLast,
        injuryDate,
      };
    }

    const hasCadence = cadenceDays !== undefined && cadenceDays > 0;
    if (hasCadence) {
      await persistLastCompletedCache(formId, serverLast);
      return {
        pending: isDueForCadence(serverLast, cadenceDays, nowMs),
        lastCompletedAt: serverLast,
        injuryDate,
      };
    }

    const pending = serverLast === null;
    return {
      pending,
      lastCompletedAt: serverLast,
      injuryDate,
    };
  } catch {
    return {
      pending: true,
      lastCompletedAt: null,
      injuryDate: null,
    };
  }
}

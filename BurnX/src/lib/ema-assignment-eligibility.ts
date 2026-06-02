import { isEmaFormId } from "../constants/ema-forms";
import {
  loadTodayEmaState,
  resolveEmaPendingFromState,
} from "./ema-today-state";
import type { AssignmentSnapshot } from "./form-assignment-eligibility";

export {
  clearEmaScheduleCache,
  fetchFormScheduleForDate,
  getTodayFormSchedule,
} from "./ema-schedule-loader";
export { clearEmaTodayState, loadTodayEmaState } from "./ema-today-state";

/**
 * Pending = now inside any slot window that includes this form AND no submission for that form
 * within that slot's open/close window on today's calendar date.
 */
export async function resolveEmaAssignmentPending(
  formId: string,
  nowMs: number,
): Promise<boolean> {
  if (!isEmaFormId(formId)) return false;

  const state = await loadTodayEmaState({ nowMs });
  return resolveEmaPendingFromState(formId, state, nowMs);
}

export async function resolveEmaAssignmentSnapshot(
  formId: string,
): Promise<AssignmentSnapshot> {
  const nowMs = Date.now();
  const state = await loadTodayEmaState({ nowMs });
  const recentIsos = state.recentIsosByFormId[formId] ?? [];
  const rawLast = recentIsos[0];
  const lastCompletedAt =
    typeof rawLast === "string" && rawLast.trim() !== "" ? rawLast.trim() : null;

  return {
    pending: resolveEmaPendingFromState(formId, state, nowMs),
    lastCompletedAt,
    injuryDate: state.injuryDate,
  };
}

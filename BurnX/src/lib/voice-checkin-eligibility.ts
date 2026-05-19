import type { WeeklyLocalAssignmentSlots } from "../constants/forms/types";
import { getLastCompletion } from "./burn-date";
import { setAssignmentLastCompletedIso } from "./form-assignment-cache-storage";
import { getSubjectFromStoredIdToken } from "./jwt";
import {
  getWeeklyLocalSlotWindowContaining,
  isWithinWeeklyLocalSlotWindow,
} from "./weekly-local-slot-window";

export const VOICE_CHECKIN_ASSIGNMENT_FORM_ID = "voice_checkin_v1" as const;

/**
 * Bounds of the Voice slot that contains **`nowMs`**: **`[windowStartMs, nextWindowStartMs)`** (device local).
 * **`nextWindowStartMs`** is the next Mon/Wed/Fri **`assignmentTime`** after **`windowStartMs`**.
 */
export function getVoiceWeeklySlotBoundsContaining(
  nowMs: number,
  slots: WeeklyLocalAssignmentSlots,
): { windowStartMs: number; nextWindowStartMs: number } | null {
  const w = getWeeklyLocalSlotWindowContaining(nowMs, slots);
  if (!w) return null;
  return {
    windowStartMs: w.startMs,
    nextWindowStartMs: w.endMs,
  };
}

/**
 * Latest **`voice_checkin_v1`** submission counts for “this slot” when **`created_at`** is ≥
 * **`windowStartMs`** and ≤ **`now`** (server newest-first **`GET /form-responses`**).
 */
export function voiceCheckinRecordedThisSlotVsServerNow(
  nowMs: number,
  windowStartMs: number,
  latestSubmissionCreatedIso: string | null,
): boolean {
  if (
    latestSubmissionCreatedIso === null ||
    typeof latestSubmissionCreatedIso !== "string"
  )
    return false;
  const t = latestSubmissionCreatedIso.trim();
  if (t === "") return false;
  const submissionMs = Date.parse(t);
  if (!Number.isFinite(submissionMs)) return false;

  return submissionMs >= windowStartMs && submissionMs <= nowMs;
}

/** Within weekly slot: show assignment iff **`getLastCompletion`** has no **`voice_checkin_v1`** row this slot (newest **`created_at`** from **`GET`**; read-through cache mirror same as scale forms). */
export async function resolveVoiceWeeklyAssignmentPending(
  slots: WeeklyLocalAssignmentSlots,
  nowMs: number,
): Promise<boolean> {
  if (!isWithinWeeklyLocalSlotWindow(nowMs, slots)) return false;

  const bounds = getVoiceWeeklySlotBoundsContaining(nowMs, slots);
  if (!bounds) return false;

  const iso = await getLastCompletion(VOICE_CHECKIN_ASSIGNMENT_FORM_ID);
  const sub = await getSubjectFromStoredIdToken();
  if (sub !== null) {
    try {
      await setAssignmentLastCompletedIso(sub, VOICE_CHECKIN_ASSIGNMENT_FORM_ID, iso);
    } catch {
      /* non-fatal mirror */
    }
  }

  const recorded = voiceCheckinRecordedThisSlotVsServerNow(nowMs, bounds.windowStartMs, iso);
  return !recorded;
}

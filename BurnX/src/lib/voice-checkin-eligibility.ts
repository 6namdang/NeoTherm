import { VOICE_CHECKIN_FORM } from "../constants/forms/voice-checkin";
import { getLastCompletion } from "./burn-date";
import {
  assignmentLastCompletedKey,
  setAssignmentLastCompletedIso,
} from "./form-assignment-cache-storage";
import { getSubjectFromStoredIdToken } from "./jwt";
import { getStorageItem } from "./storage";
import {
  getCurrentFullDayWindow,
  submissionInWindow,
} from "./weekly-full-day-assignment";

export const VOICE_CHECKIN_ASSIGNMENT_FORM_ID = "voice_checkin_v1" as const;

export const VOICE_ASSIGNMENT_DAYS = VOICE_CHECKIN_FORM.assignmentWeeklyFullDays;

function pickLatestIso(
  ...isos: (string | null | undefined)[]
): string | null {
  let bestMs: number | null = null;
  let bestIso: string | null = null;
  for (const iso of isos) {
    if (iso === null || iso === undefined) continue;
    const t = iso.trim();
    if (t === "") continue;
    const ms = Date.parse(t);
    if (!Number.isFinite(ms)) continue;
    if (bestMs === null || ms > bestMs) {
      bestMs = ms;
      bestIso = t;
    }
  }
  return bestIso;
}

/** Newest voice completion from API and local mirror (pilot: `/voice/sessions` + optional form-response). */
async function getLastVoiceCheckinIso(): Promise<string | null> {
  const sub = await getSubjectFromStoredIdToken();
  const [serverLast, cached] = await Promise.all([
    getLastCompletion(VOICE_CHECKIN_ASSIGNMENT_FORM_ID),
    sub
      ? getStorageItem(assignmentLastCompletedKey(sub, VOICE_CHECKIN_ASSIGNMENT_FORM_ID))
      : Promise.resolve(null),
  ]);

  if (sub) {
    try {
      await setAssignmentLastCompletedIso(sub, VOICE_CHECKIN_ASSIGNMENT_FORM_ID, serverLast);
    } catch {
      /* non-fatal mirror */
    }
  }

  return pickLatestIso(serverLast, cached);
}

/** True when `now` falls on Mon / Wed / Fri local calendar day (`[00:00, next midnight)`). */
export function isVoiceAssignmentDayOpen(nowMs: number): boolean {
  return getCurrentFullDayWindow(nowMs, VOICE_ASSIGNMENT_DAYS) !== null;
}

/**
 * Pilot: assignable only on Mon, Wed, Fri (device local, full calendar day).
 * No carryover — Tue–Sun and after midnight on assignment days without submit, the form is closed.
 */
export async function resolveVoiceAssignmentPending(
  nowMs: number,
): Promise<boolean> {
  const window = getCurrentFullDayWindow(nowMs, VOICE_ASSIGNMENT_DAYS);
  if (!window) return false;

  const last = await getLastVoiceCheckinIso();
  return !submissionInWindow(last, window.startMs, window.endMs);
}

/** @deprecated Use {@link resolveVoiceAssignmentPending}. */
export async function resolveVoiceWeeklyAssignmentPending(
  _slots: unknown,
  nowMs: number,
): Promise<boolean> {
  return resolveVoiceAssignmentPending(nowMs);
}

/** Call after **`POST /voice/sessions`** succeeds so the Voice tab updates immediately. */
export async function persistVoiceCheckinSubmissionClientTime(): Promise<void> {
  const sub = await getSubjectFromStoredIdToken();
  if (!sub) return;
  await setAssignmentLastCompletedIso(
    sub,
    VOICE_CHECKIN_ASSIGNMENT_FORM_ID,
    new Date().toISOString(),
  );
}

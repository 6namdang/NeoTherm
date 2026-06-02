import {
  firstRemainingLongFormId,
  resolveLongAssessmentState,
} from "./long-assessment-eligibility";
import { fetchLongAssessmentLastCompletions } from "./long-assessment-resolve";
import { getOnboardingSubmittedAt } from "./burn-date";
import {
  LONG_FORM_IDS,
  isLongAssessmentMemberFormId,
} from "./care-program-form-groups";
import { programDayNumber } from "./program-day";
import {
  mergeCompletedFormIds,
  normalizeLongAssessmentSession,
  reconcileSessionFromSnapshot,
  type LongAssessmentSession,
} from "./long-assessment-session-state";
import {
  deleteStorageItem,
  getStorageItem,
  setStorageItem,
} from "./storage";

export type { LongAssessmentSession } from "./long-assessment-session-state";
export {
  mergeCompletedFormIds,
  reconcileSessionFromSnapshot,
} from "./long-assessment-session-state";

const SESSION_KEY = "longAssessmentSession";

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadLongAssessmentSession(): Promise<LongAssessmentSession | null> {
  const raw = await getStorageItem(SESSION_KEY);
  return normalizeLongAssessmentSession(readJson(raw, null));
}

export async function saveLongAssessmentSession(
  session: LongAssessmentSession,
): Promise<void> {
  await setStorageItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearLongAssessmentSession(): Promise<void> {
  await deleteStorageItem(SESSION_KEY);
}

export async function getCurrentDueProgramDay(
  now: Date = new Date(),
): Promise<number | null> {
  const onboardingSubmittedAt = await getOnboardingSubmittedAt();
  return programDayNumber(onboardingSubmittedAt, now);
}

export async function bootstrapLongAssessmentSession(
  now: Date = new Date(),
): Promise<{
  snap: import("./long-assessment-eligibility").LongAssessmentSnapshot;
  session: LongAssessmentSession | null;
}> {
  const onboardingSubmittedAt = await getOnboardingSubmittedAt();
  const lastCompletions = await fetchLongAssessmentLastCompletions();
  const snap = resolveLongAssessmentState({
    onboardingSubmittedAt,
    lastCompletions,
    now,
  });

  if (!snap.dueToday || snap.programDay === null) {
    await clearLongAssessmentSession();
    return { snap, session: null };
  }

  const stored = await loadLongAssessmentSession();
  let session: LongAssessmentSession | null = null;

  if (stored !== null && stored.programDay === snap.programDay) {
    session = reconcileSessionFromSnapshot(stored, snap);
  } else if (snap.completedFormIds.length > 0) {
    session = reconcileSessionFromSnapshot(null, snap);
  } else {
    await clearLongAssessmentSession();
    session = null;
  }

  if (session) {
    await saveLongAssessmentSession(session);
  }

  return { snap, session };
}

export async function markLongAssessmentFormComplete(
  formId: string,
  programDay: number,
): Promise<LongAssessmentSession | null> {
  if (!isLongAssessmentMemberFormId(formId)) return null;
  const stored = await loadLongAssessmentSession();
  const base: LongAssessmentSession =
    stored !== null && stored.programDay === programDay
      ? stored
      : {
          programDay,
          completedFormIds: [],
          activeFormId: null,
        };
  const completedFormIds = mergeCompletedFormIds(
    [],
    [...base.completedFormIds, formId],
  );
  const remaining = LONG_FORM_IDS.filter((id) => !completedFormIds.includes(id));
  if (remaining.length === 0) {
    await clearLongAssessmentSession();
    return null;
  }
  const next = firstRemainingLongFormId(remaining);
  const session: LongAssessmentSession = {
    programDay,
    completedFormIds,
    activeFormId: next,
  };
  await saveLongAssessmentSession(session);
  return session;
}

export async function hasActiveLongAssessmentSession(
  programDay: number | null,
): Promise<boolean> {
  if (programDay === null) return false;
  const session = await loadLongAssessmentSession();
  return session !== null && session.programDay === programDay;
}

export async function startLongAssessmentSession(
  snap: import("./long-assessment-eligibility").LongAssessmentSnapshot,
): Promise<LongAssessmentSession | null> {
  if (!snap.dueToday || snap.programDay === null || !snap.pending) {
    return null;
  }
  const nextFormId = firstRemainingLongFormId(snap.remainingFormIds);
  if (!nextFormId) return null;
  const session: LongAssessmentSession = {
    programDay: snap.programDay,
    completedFormIds: [...snap.completedFormIds],
    activeFormId: nextFormId,
  };
  await saveLongAssessmentSession(session);
  return session;
}

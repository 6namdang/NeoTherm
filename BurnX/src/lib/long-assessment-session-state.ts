import {
  firstRemainingLongFormId,
  type LongAssessmentSnapshot,
} from "./long-assessment-eligibility";
import {
  LONG_FORM_IDS,
  isLongAssessmentMemberFormId,
} from "./care-program-form-groups";

export type LongAssessmentSession = {
  programDay: number;
  completedFormIds: string[];
  activeFormId: string | null;
};

export function mergeCompletedFormIds(
  serverCompleted: readonly string[],
  localCompleted: readonly string[],
): string[] {
  const set = new Set<string>();
  for (const id of serverCompleted) set.add(id);
  for (const id of localCompleted) {
    if (isLongAssessmentMemberFormId(id)) set.add(id);
  }
  return LONG_FORM_IDS.filter((id) => set.has(id));
}

export function reconcileSessionFromSnapshot(
  session: LongAssessmentSession | null,
  snap: LongAssessmentSnapshot,
): LongAssessmentSession | null {
  if (!snap.dueToday || snap.programDay === null) {
    return null;
  }
  if (session !== null && session.programDay !== snap.programDay) {
    session = null;
  }
  const completedFormIds = mergeCompletedFormIds(
    snap.completedFormIds,
    session?.completedFormIds ?? [],
  );
  const remaining = LONG_FORM_IDS.filter((id) => !completedFormIds.includes(id));
  if (remaining.length === 0) {
    return null;
  }
  const nextFormId =
    session?.activeFormId &&
    remaining.includes(session.activeFormId as (typeof LONG_FORM_IDS)[number])
      ? session.activeFormId
      : firstRemainingLongFormId(remaining);
  return {
    programDay: snap.programDay,
    completedFormIds,
    activeFormId: nextFormId,
  };
}

export function normalizeLongAssessmentSession(
  raw: unknown,
): LongAssessmentSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const programDay =
    typeof o.programDay === "number" && Number.isFinite(o.programDay)
      ? Math.floor(o.programDay)
      : null;
  if (programDay === null || programDay < 1) return null;
  const completedFormIds = Array.isArray(o.completedFormIds)
    ? o.completedFormIds.filter(
        (id): id is string =>
          typeof id === "string" &&
          isLongAssessmentMemberFormId(id.trim()) &&
          id.trim() !== "",
      )
    : [];
  const activeFormId =
    typeof o.activeFormId === "string" && o.activeFormId.trim() !== ""
      ? o.activeFormId.trim()
      : null;
  return {
    programDay,
    completedFormIds: [...new Set(completedFormIds)],
    activeFormId,
  };
}

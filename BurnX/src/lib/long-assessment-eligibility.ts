import {
  LONG_FORM_IDS,
} from "./care-program-form-groups";
import {
  getLocalDayBoundsMs,
  submissionInWindow,
} from "./weekly-full-day-assignment";
import { programDayNumber, localDateForProgramDay } from "./program-day";

export const LONG_ASSESSMENT_INTERVAL = 30;

export type LongAssessmentSnapshot = {
  pending: boolean;
  programDay: number | null;
  dueToday: boolean;
  completedFormIds: readonly string[];
  remainingFormIds: readonly string[];
};

export function isLongAssessmentDueProgramDay(
  programDay: number | null,
): boolean {
  if (programDay === null || programDay < LONG_ASSESSMENT_INTERVAL) return false;
  return programDay % LONG_ASSESSMENT_INTERVAL === 0;
}

export function completedLongFormsInLocalDay(
  lastCompletions: Readonly<Record<string, string | null>>,
  nowMs: number,
  formIds: readonly string[] = LONG_FORM_IDS,
): string[] {
  const { startMs, endMs } = getLocalDayBoundsMs(nowMs);
  return formIds.filter((id) =>
    submissionInWindow(lastCompletions[id] ?? null, startMs, endMs),
  );
}

export function resolveLongAssessmentState(params: {
  onboardingSubmittedAt: string | null;
  lastCompletions: Readonly<Record<string, string | null>>;
  now?: Date;
}): LongAssessmentSnapshot {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const programDay = programDayNumber(params.onboardingSubmittedAt, now);
  const dueToday = isLongAssessmentDueProgramDay(programDay);

  if (!dueToday) {
    return {
      pending: false,
      programDay,
      dueToday: false,
      completedFormIds: [],
      remainingFormIds: [...LONG_FORM_IDS],
    };
  }

  const completedFormIds = completedLongFormsInLocalDay(
    params.lastCompletions,
    nowMs,
  );
  const completedSet = new Set(completedFormIds);
  const remainingFormIds = LONG_FORM_IDS.filter((id) => !completedSet.has(id));

  return {
    pending: remainingFormIds.length > 0,
    programDay,
    dueToday: true,
    completedFormIds,
    remainingFormIds,
  };
}

export function firstRemainingLongFormId(
  remainingFormIds: readonly string[],
): string | null {
  for (const id of LONG_FORM_IDS) {
    if (remainingFormIds.includes(id)) return id;
  }
  return null;
}

/** Next milestone program day when Long Assessment opens (may be today if due and pending). */
export function nextLongAssessmentProgramDay(
  currentProgramDay: number | null,
  snap: Pick<LongAssessmentSnapshot, "dueToday" | "pending">,
): number | null {
  if (currentProgramDay === null) return null;
  if (snap.dueToday && snap.pending) return currentProgramDay;
  if (currentProgramDay < LONG_ASSESSMENT_INTERVAL) {
    return LONG_ASSESSMENT_INTERVAL;
  }
  if (
    currentProgramDay % LONG_ASSESSMENT_INTERVAL === 0 &&
    snap.dueToday &&
    !snap.pending
  ) {
    return currentProgramDay + LONG_ASSESSMENT_INTERVAL;
  }
  return (
    Math.ceil(currentProgramDay / LONG_ASSESSMENT_INTERVAL) *
    LONG_ASSESSMENT_INTERVAL
  );
}

export function formatLongAssessmentNextOpenLine(
  onboardingSubmittedAt: string | null,
  snap: LongAssessmentSnapshot,
  now: Date = new Date(),
): string | null {
  if (
    typeof onboardingSubmittedAt !== "string" ||
    onboardingSubmittedAt.trim() === ""
  ) {
    return null;
  }
  const nextDay = nextLongAssessmentProgramDay(snap.programDay, snap);
  if (nextDay === null) return null;

  const openDate = localDateForProgramDay(onboardingSubmittedAt.trim(), nextDay);
  if (!openDate) return null;

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(openDate);
  const opensToday =
    snap.dueToday &&
    snap.pending &&
    snap.programDay === nextDay &&
    openDate.toDateString() === now.toDateString();

  if (opensToday) {
    return `Opens today · ${dateLabel} (Day ${nextDay})`;
  }
  return `Next opens ${dateLabel} (Day ${nextDay})`;
}

const LONG_ASSESSMENT_TAB_INTRO =
  "Pain, sleep, fatigue, and mental health questionnaires bundled for each 30-day program milestone.";

export function buildLongAssessmentTabSubtitle(
  onboardingSubmittedAt: string | null,
  snap: LongAssessmentSnapshot,
  now: Date = new Date(),
): string {
  const schedule = formatLongAssessmentNextOpenLine(
    onboardingSubmittedAt,
    snap,
    now,
  );
  if (!schedule) return LONG_ASSESSMENT_TAB_INTRO;
  return `${LONG_ASSESSMENT_TAB_INTRO} ${schedule}.`;
}

export function buildLongAssessmentTabEmptySubtitle(
  onboardingSubmittedAt: string | null,
  snap: LongAssessmentSnapshot,
  now: Date = new Date(),
): string {
  const schedule = formatLongAssessmentNextOpenLine(
    onboardingSubmittedAt,
    snap,
    now,
  );
  if (!schedule) {
    return "Your Long Assessment opens on program Day 30, 60, 90, and every 30 days after that — today only, no carryover.";
  }
  return `${schedule}. Opens on that day only — no carryover to the next day.`;
}

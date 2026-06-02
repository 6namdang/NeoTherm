import { localCalendarDayOffset } from "./burn-injury-day";

const DAY_MS = 1000 * 60 * 60 * 24;

function onboardingToLocalMidnightMs(iso: string): number | null {
  const t = iso.trim();
  if (t === "") return null;
  const parsed = t.includes("T") ? Date.parse(t) : Date.parse(`${t}T12:00:00`);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local calendar date for program day N (Day 1 = onboarding submission day). */
export function localDateForProgramDay(
  onboardingSubmittedAtIso: string,
  programDay: number,
): Date | null {
  if (programDay < 1) return null;
  const anchor = onboardingToLocalMidnightMs(onboardingSubmittedAtIso);
  if (anchor === null) return null;
  return new Date(anchor + (programDay - 1) * DAY_MS);
}

/**
 * Days in the NeoTherm program from onboarding intake submission.
 * Day 1 = submission calendar day, Day 2 = next day, etc.
 */
export function programDayNumber(
  onboardingSubmittedAtIso: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (
    typeof onboardingSubmittedAtIso !== "string" ||
    onboardingSubmittedAtIso.trim() === ""
  ) {
    return null;
  }
  const offset = localCalendarDayOffset(onboardingSubmittedAtIso.trim(), now);
  if (offset === null) return null;
  return offset + 1;
}

/** Home welcome subline label, e.g. "Day 1", "Day 12". */
export function formatProgramDayLabel(
  onboardingSubmittedAtIso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const day = programDayNumber(onboardingSubmittedAtIso, now);
  if (day === null) return null;
  return `Day ${day}`;
}

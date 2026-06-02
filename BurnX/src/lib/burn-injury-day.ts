const DAY_MS = 1000 * 60 * 60 * 24;

function anchorToLocalMidnightMs(iso: string): number | null {
  const t = iso.trim();
  if (t === "") return null;
  const parsed = t.includes("T") ? Date.parse(t) : Date.parse(`${t}T12:00:00`);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole local calendar days from anchor date/time to `now` (0 on the anchor day). */
export function localCalendarDayOffset(
  anchorIso: string,
  now: Date = new Date(),
): number | null {
  const anchorMidnight = anchorToLocalMidnightMs(anchorIso);
  if (anchorMidnight === null) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - anchorMidnight) / DAY_MS);
  if (days < 0) return null;
  return days;
}

/**
 * Post-burn day number using local calendar midnights.
 * Day 0 = injury date, Day 1 = next calendar day, etc.
 */
export function burnInjuryDayNumber(
  injuryDate: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (typeof injuryDate !== "string" || injuryDate.trim() === "") return null;
  return localCalendarDayOffset(injuryDate.trim(), now);
}

/** Injury-based label (0-indexed), e.g. "Day 0", "Day 12". */
export function formatBurnInjuryDayLabel(
  injuryDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const day = burnInjuryDayNumber(injuryDate, now);
  if (day === null) return null;
  return `Day ${day}`;
}

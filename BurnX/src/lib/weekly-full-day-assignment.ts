const DAY_MS = 86_400_000;

function uniqueSortedDays(days: readonly number[]): number[] {
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
}

function localMidnightMs(y: number, mo: number, da: number): number {
  return new Date(y, mo, da, 0, 0, 0, 0).getTime();
}

/** Bounds `[startMs, endMs)` for the calendar day containing `dateMs`. */
export function getLocalDayBoundsMs(dateMs: number): { startMs: number; endMs: number } {
  const d = new Date(dateMs);
  const y = d.getFullYear();
  const mo = d.getMonth();
  const da = d.getDate();
  const startMs = localMidnightMs(y, mo, da);
  return { startMs, endMs: startMs + DAY_MS };
}

/**
 * If `nowMs` falls on an allowed weekday, returns that day's `[00:00, next midnight)`.
 * Otherwise `null`.
 */
export function getCurrentFullDayWindow(
  nowMs: number,
  daysOfWeek: readonly number[],
): { startMs: number; endMs: number } | null {
  const allowed = uniqueSortedDays(daysOfWeek);
  if (allowed.length === 0) return null;

  const now = new Date(nowMs);
  if (!allowed.includes(now.getDay())) return null;

  const bounds = getLocalDayBoundsMs(nowMs);
  return { startMs: bounds.startMs, endMs: bounds.endMs };
}

export function submissionInWindow(
  iso: string | null | undefined,
  startMs: number,
  endMs: number,
): boolean {
  if (iso === null || iso === undefined) return false;
  const t = iso.trim();
  if (t === "") return false;
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) return false;
  return ms >= startMs && ms < endMs;
}

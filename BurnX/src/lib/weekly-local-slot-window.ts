import type { WeeklyLocalAssignmentSlots } from "../constants/forms/types";

const DAY_MS = 86_400_000;

function slotInstantLocal(y: number, mo: number, da: number, hour: number, minute: number): number {
  return new Date(y, mo, da, hour, minute, 0, 0).getTime();
}

function uniqueSortedDays(days: readonly number[]): number[] {
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
}

/** All slot start times in `[rangeStartMs, rangeEndMs]` (local calendar). */
function collectSlotStartsInRange(
  rangeStartMs: number,
  rangeEndMs: number,
  cfg: WeeklyLocalAssignmentSlots,
): number[] {
  const days = uniqueSortedDays(cfg.daysOfWeek);
  if (days.length === 0) return [];

  const out: number[] = [];
  const d = new Date(rangeStartMs);
  d.setHours(12, 0, 0, 0);

  while (d.getTime() <= rangeEndMs) {
    const wd = d.getDay();
    if (days.includes(wd)) {
      const s = slotInstantLocal(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        cfg.hour,
        cfg.minute,
      );
      if (s >= rangeStartMs && s <= rangeEndMs) out.push(s);
    }
    d.setDate(d.getDate() + 1);
  }
  return out.sort((a, b) => a - b);
}

function nextSlotStrictlyAfter(afterMs: number, cfg: WeeklyLocalAssignmentSlots): number {
  let probe = afterMs + 60_000;
  for (let i = 0; i < 16; i += 1) {
    const slots = collectSlotStartsInRange(probe - DAY_MS, probe + 21 * DAY_MS, cfg);
    const next = slots.find((s) => s > afterMs);
    if (next !== undefined) return next;
    probe += 7 * DAY_MS;
  }
  throw new Error("Could not locate next assignment slot boundary.");
}

/** Inclusive slot start `startMs`, exclusive next slot `endMs`. `nowMs` lies in `[startMs, endMs)`. */
export function getWeeklyLocalSlotWindowContaining(
  nowMs: number,
  cfg: WeeklyLocalAssignmentSlots,
): { startMs: number; endMs: number } | null {
  const days = uniqueSortedDays(cfg.daysOfWeek);
  if (days.length === 0) return null;

  const lookbackStart = nowMs - 21 * DAY_MS;
  const lookAheadEnd = nowMs + 21 * DAY_MS;
  const slots = collectSlotStartsInRange(lookbackStart, lookAheadEnd, cfg);
  const atOrBefore = slots.filter((s) => s <= nowMs);
  if (atOrBefore.length === 0) return null;

  const startMs = Math.max(...atOrBefore);
  let endMs = slots.find((s) => s > startMs);
  if (endMs === undefined) {
    endMs = nextSlotStrictlyAfter(startMs, cfg);
  }
  return { startMs, endMs };
}

/** True when `nowMs` is in `[current slot, next slot)` (local time); ignores completions. */
export function isWithinWeeklyLocalSlotWindow(
  nowMs: number,
  cfg: WeeklyLocalAssignmentSlots,
): boolean {
  const w = getWeeklyLocalSlotWindowContaining(nowMs, cfg);
  if (!w) return false;
  return nowMs >= w.startMs && nowMs < w.endMs;
}

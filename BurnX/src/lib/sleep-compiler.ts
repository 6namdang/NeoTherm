import { localDateKey } from "./home-location-accumulator";
import type { SleepDailySummary } from "./sleep-storage";

const MS_PER_MINUTE = 60_000;

function createEmptySummary(date: string): SleepDailySummary {
  return {
    date,
    sleepMinutes: 0,
    lastUpdatedAt: null,
  };
}

function getSummaryForDate(
  summaries: SleepDailySummary[],
  date: string,
): SleepDailySummary {
  return summaries.find((summary) => summary.date === date) ?? createEmptySummary(date);
}

function startOfNextLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function upsertSummary(
  summaries: SleepDailySummary[],
  summary: SleepDailySummary,
): SleepDailySummary[] {
  const next = summaries.filter((item) => item.date !== summary.date);
  next.push(summary);
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

function addSleepMinutes(
  summary: SleepDailySummary,
  minutes: number,
  updatedAt: string,
): SleepDailySummary {
  if (minutes <= 0) {
    return {
      ...summary,
      lastUpdatedAt: updatedAt,
    };
  }
  return {
    ...summary,
    sleepMinutes: summary.sleepMinutes + minutes,
    lastUpdatedAt: updatedAt,
  };
}

export function compileSleepBlock(
  anchor: Date,
  wake: Date,
  existingSummaries: SleepDailySummary[],
): SleepDailySummary[] {
  if (wake <= anchor) {
    return existingSummaries;
  }

  let cursor = new Date(anchor);
  let nextSummaries = existingSummaries;
  const updatedAt = wake.toISOString();

  while (cursor < wake) {
    const segmentEnd = new Date(
      Math.min(startOfNextLocalDay(cursor).getTime(), wake.getTime()),
    );
    const minutes = Math.floor((segmentEnd.getTime() - cursor.getTime()) / MS_PER_MINUTE);
    const date = localDateKey(cursor);
    const summary = getSummaryForDate(nextSummaries, date);

    nextSummaries = upsertSummary(
      nextSummaries,
      addSleepMinutes(summary, minutes, updatedAt),
    );
    cursor = segmentEnd;
  }

  return nextSummaries;
}

export const SLEEP_MIN_DURATION_MS = 300 * MS_PER_MINUTE;
export const SLEEP_BEDTIME_HOUR = 19;
export const SLEEP_MAX_STEPS = 50;
export const SLEEP_PEDOMETER_DELAY_MS = 200;

export function isBedtimeEligible(localHour: number, insideHome: boolean): boolean {
  return insideHome && localHour >= SLEEP_BEDTIME_HOUR;
}

export function isSleepDurationEligible(anchor: Date, wake: Date): boolean {
  return wake.getTime() - anchor.getTime() >= SLEEP_MIN_DURATION_MS;
}

export function isStepCountEligible(steps: number): boolean {
  return Number.isFinite(steps) && steps < SLEEP_MAX_STEPS;
}

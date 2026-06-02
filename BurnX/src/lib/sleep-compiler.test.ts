import { describe, expect, it } from "vitest";

import {
  compileSleepBlock,
  isBedtimeEligible,
  isSleepDurationEligible,
  isStepCountEligible,
  SLEEP_MIN_DURATION_MS,
} from "./sleep-compiler";
import type { SleepDailySummary } from "./sleep-storage";

function atLocal(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function minutesFor(summaries: SleepDailySummary[], date: string): number {
  return summaries.find((summary) => summary.date === date)?.sleepMinutes ?? 0;
}

describe("compileSleepBlock", () => {
  it("splits a sleep block across midnight", () => {
    const anchor = atLocal(2026, 5, 26, 23, 0);
    const wake = atLocal(2026, 5, 27, 7, 0);

    const summaries = compileSleepBlock(anchor, wake, []);

    expect(minutesFor(summaries, "2026-05-26")).toBe(60);
    expect(minutesFor(summaries, "2026-05-27")).toBe(420);
  });

  it("credits a same-night block to one bucket", () => {
    const anchor = atLocal(2026, 5, 26, 22, 30);
    const wake = atLocal(2026, 5, 27, 6, 0);

    const summaries = compileSleepBlock(anchor, wake, []);

    expect(minutesFor(summaries, "2026-05-26")).toBe(90);
    expect(minutesFor(summaries, "2026-05-27")).toBe(360);
  });

  it("sums into existing daily totals", () => {
    const anchor = atLocal(2026, 5, 27, 1, 0);
    const wake = atLocal(2026, 5, 27, 6, 0);
    const existing: SleepDailySummary[] = [
      {
        date: "2026-05-27",
        sleepMinutes: 120,
        lastUpdatedAt: "2026-05-27T01:00:00.000Z",
      },
    ];

    const summaries = compileSleepBlock(anchor, wake, existing);

    expect(minutesFor(summaries, "2026-05-27")).toBe(420);
  });
});

describe("sleep heuristics", () => {
  it("requires inside home and hour >= 19 for bedtime", () => {
    expect(isBedtimeEligible(18, true)).toBe(false);
    expect(isBedtimeEligible(19, true)).toBe(true);
    expect(isBedtimeEligible(22, false)).toBe(false);
  });

  it("requires at least five hours between anchor and wake", () => {
    const anchor = atLocal(2026, 5, 26, 22, 0);
    const shortWake = new Date(anchor.getTime() + SLEEP_MIN_DURATION_MS - 60_000);
    const longWake = new Date(anchor.getTime() + SLEEP_MIN_DURATION_MS);

    expect(isSleepDurationEligible(anchor, shortWake)).toBe(false);
    expect(isSleepDurationEligible(anchor, longWake)).toBe(true);
  });

  it("accepts fewer than fifty steps", () => {
    expect(isStepCountEligible(49)).toBe(true);
    expect(isStepCountEligible(50)).toBe(false);
  });
});

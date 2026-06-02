import { describe, expect, it } from "vitest";

import {
  applyHomeAwayTransition,
  getSummaryForDate,
  homeAwayDayHeading,
  localDateKey,
} from "./home-location-accumulator";
import type { HomeAwayDailySummary } from "./home-location-types";

function atLocal(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function summaryMinutes(
  summaries: HomeAwayDailySummary[],
  date: string,
): { home: number; outside: number } {
  const row = getSummaryForDate(summaries, date);
  return { home: row.homeMinutes, outside: row.outsideMinutes };
}

describe("applyHomeAwayTransition", () => {
  it("splits a 36-hour inside stretch across three calendar days", () => {
    const fridayStart = atLocal(2026, 5, 22, 20);
    const sundayEnd = atLocal(2026, 5, 24, 8);

    const summaries = applyHomeAwayTransition({
      previousState: "inside",
      previousTransitionAt: fridayStart,
      nextState: "outside",
      observedAt: sundayEnd,
      summaries: [],
    });

    expect(summaryMinutes(summaries, "2026-05-22")).toEqual({ home: 240, outside: 0 });
    expect(summaryMinutes(summaries, "2026-05-23")).toEqual({ home: 1440, outside: 0 });
    expect(summaryMinutes(summaries, "2026-05-24")).toEqual({ home: 480, outside: 0 });
  });

  it("splits outside minutes at local midnight", () => {
    const start = atLocal(2026, 5, 26, 23, 0);
    const end = atLocal(2026, 5, 27, 1, 0);

    const summaries = applyHomeAwayTransition({
      previousState: "outside",
      previousTransitionAt: start,
      nextState: "outside",
      observedAt: end,
      summaries: [],
    });

    expect(summaryMinutes(summaries, "2026-05-26")).toEqual({ home: 0, outside: 60 });
    expect(summaryMinutes(summaries, "2026-05-27")).toEqual({ home: 0, outside: 60 });
  });

  it("credits same-state foreground refresh to the current day", () => {
    const start = atLocal(2026, 5, 26, 10, 0);
    const end = atLocal(2026, 5, 26, 11, 30);

    const summaries = applyHomeAwayTransition({
      previousState: "inside",
      previousTransitionAt: start,
      nextState: "inside",
      observedAt: end,
      summaries: [],
    });

    expect(summaryMinutes(summaries, "2026-05-26")).toEqual({ home: 90, outside: 0 });
  });

  it("does not inflate minutes when observedAt is not after lastTransitionAt", () => {
    const at = atLocal(2026, 5, 26, 12, 0);

    const summaries = applyHomeAwayTransition({
      previousState: "inside",
      previousTransitionAt: at,
      nextState: "outside",
      observedAt: at,
      summaries: [],
    });

    expect(summaryMinutes(summaries, "2026-05-26")).toEqual({ home: 0, outside: 0 });
  });

  it("does not credit home or outside minutes when previousState is unknown", () => {
    const start = atLocal(2026, 5, 25, 8, 0);
    const end = atLocal(2026, 5, 26, 9, 0);

    const summaries = applyHomeAwayTransition({
      previousState: "unknown",
      previousTransitionAt: start,
      nextState: "inside",
      observedAt: end,
      summaries: [],
    });

    expect(summaryMinutes(summaries, "2026-05-25")).toEqual({ home: 0, outside: 0 });
    expect(summaryMinutes(summaries, "2026-05-26")).toEqual({ home: 0, outside: 0 });
  });
});

describe("homeAwayDayHeading", () => {
  const now = atLocal(2026, 5, 26, 12, 0);

  it("labels today, yesterday, and recent offsets", () => {
    expect(homeAwayDayHeading("2026-05-26", now)).toEqual({
      primary: "Today",
      secondary: "2026-05-26",
    });
    expect(homeAwayDayHeading("2026-05-25", now)).toEqual({
      primary: "Yesterday",
      secondary: "2026-05-25",
    });
    expect(homeAwayDayHeading("2026-05-24", now)).toEqual({
      primary: "2 days ago",
      secondary: "2026-05-24",
    });
  });

  it("uses a formatted date for offsets older than six days", () => {
    const heading = homeAwayDayHeading("2026-05-15", now);
    expect(heading.secondary).toBe("2026-05-15");
    expect(heading.primary).not.toBe("Today");
    expect(heading.primary).not.toContain("days ago");
  });
});

describe("localDateKey", () => {
  it("uses the device-local calendar date", () => {
    expect(localDateKey(atLocal(2026, 5, 26, 23, 59))).toBe("2026-05-26");
  });
});

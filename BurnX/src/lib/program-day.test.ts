import { describe, expect, it } from "vitest";

import { formatProgramDayLabel, programDayNumber } from "./program-day";

describe("programDayNumber", () => {
  it("returns 1 on the onboarding submission day", () => {
    const submittedAt = new Date(2026, 4, 20, 10, 0, 0).toISOString();
    const now = new Date(2026, 4, 20, 15, 30, 0);
    expect(programDayNumber(submittedAt, now)).toBe(1);
    expect(formatProgramDayLabel(submittedAt, now)).toBe("Day 1");
  });

  it("increments at local midnight after onboarding", () => {
    const submittedAt = new Date(2026, 4, 20, 22, 0, 0).toISOString();
    const now = new Date(2026, 4, 21, 0, 5, 0);
    expect(programDayNumber(submittedAt, now)).toBe(2);
    expect(formatProgramDayLabel(submittedAt, now)).toBe("Day 2");
  });

  it("returns null before onboarding submission", () => {
    const submittedAt = new Date(2026, 11, 1, 12, 0, 0).toISOString();
    const now = new Date(2026, 4, 26, 12, 0, 0);
    expect(programDayNumber(submittedAt, now)).toBeNull();
    expect(formatProgramDayLabel(submittedAt, now)).toBeNull();
  });
});

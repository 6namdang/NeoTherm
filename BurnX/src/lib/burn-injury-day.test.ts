import { describe, expect, it } from "vitest";

import {
  burnInjuryDayNumber,
  formatBurnInjuryDayLabel,
} from "./burn-injury-day";

describe("burnInjuryDayNumber", () => {
  it("returns 0 on the injury date", () => {
    const injury = "2026-05-20";
    const now = new Date(2026, 4, 20, 15, 30, 0);
    expect(burnInjuryDayNumber(injury, now)).toBe(0);
    expect(formatBurnInjuryDayLabel(injury, now)).toBe("Day 0");
  });

  it("increments at local midnight after injury", () => {
    const injury = "2026-05-20";
    const now = new Date(2026, 4, 21, 0, 5, 0);
    expect(burnInjuryDayNumber(injury, now)).toBe(1);
    expect(formatBurnInjuryDayLabel(injury, now)).toBe("Day 1");
  });

  it("returns null for future injury dates", () => {
    const injury = "2026-12-01";
    const now = new Date(2026, 4, 26, 12, 0, 0);
    expect(burnInjuryDayNumber(injury, now)).toBeNull();
    expect(formatBurnInjuryDayLabel(injury, now)).toBeNull();
  });
});

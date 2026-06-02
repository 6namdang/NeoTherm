import { describe, expect, it } from "vitest";

import { LONG_FORM_IDS } from "./care-program-form-groups";
import {
  completedLongFormsInLocalDay,
  formatLongAssessmentNextOpenLine,
  isLongAssessmentDueProgramDay,
  nextLongAssessmentProgramDay,
  resolveLongAssessmentState,
} from "./long-assessment-eligibility";

describe("isLongAssessmentDueProgramDay", () => {
  it("is false before day 30", () => {
    expect(isLongAssessmentDueProgramDay(29)).toBe(false);
    expect(isLongAssessmentDueProgramDay(1)).toBe(false);
    expect(isLongAssessmentDueProgramDay(null)).toBe(false);
  });

  it("is true on day 30, 60, 90", () => {
    expect(isLongAssessmentDueProgramDay(30)).toBe(true);
    expect(isLongAssessmentDueProgramDay(60)).toBe(true);
    expect(isLongAssessmentDueProgramDay(90)).toBe(true);
  });

  it("is false between due days", () => {
    expect(isLongAssessmentDueProgramDay(31)).toBe(false);
    expect(isLongAssessmentDueProgramDay(59)).toBe(false);
  });
});

describe("resolveLongAssessmentState", () => {
  const onboarding = "2026-01-01T12:00:00.000Z";

  it("is hidden on program day 29", () => {
    const now = new Date(2026, 0, 29, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    expect(snap.dueToday).toBe(false);
    expect(snap.pending).toBe(false);
    expect(snap.programDay).toBe(29);
  });

  it("is pending on day 30 with no submissions", () => {
    const now = new Date(2026, 0, 30, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    expect(snap.dueToday).toBe(true);
    expect(snap.pending).toBe(true);
    expect(snap.programDay).toBe(30);
    expect(snap.remainingFormIds).toHaveLength(LONG_FORM_IDS.length);
  });

  it("is not pending when all forms submitted today", () => {
    const now = new Date(2026, 0, 30, 15, 0, 0);
    const submittedAt = new Date(2026, 0, 30, 10, 0, 0).toISOString();
    const lastCompletions = Object.fromEntries(
      LONG_FORM_IDS.map((id) => [id, submittedAt]),
    );
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions,
      now,
    });
    expect(snap.pending).toBe(false);
    expect(snap.completedFormIds).toHaveLength(LONG_FORM_IDS.length);
  });

  it("resumes with partial completion on day 30", () => {
    const now = new Date(2026, 0, 30, 15, 0, 0);
    const submittedAt = new Date(2026, 0, 30, 10, 0, 0).toISOString();
    const lastCompletions: Record<string, string | null> = {
      [LONG_FORM_IDS[0]!]: submittedAt,
      [LONG_FORM_IDS[1]!]: submittedAt,
      [LONG_FORM_IDS[2]!]: submittedAt,
    };
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions,
      now,
    });
    expect(snap.pending).toBe(true);
    expect(snap.completedFormIds).toHaveLength(3);
    expect(snap.remainingFormIds).toHaveLength(LONG_FORM_IDS.length - 3);
    expect(snap.remainingFormIds[0]).toBe(LONG_FORM_IDS[3]);
  });

  it("is hidden on day 31 even if incomplete yesterday", () => {
    const now = new Date(2026, 0, 31, 12, 0, 0);
    const yesterday = new Date(2026, 0, 30, 10, 0, 0).toISOString();
    const lastCompletions: Record<string, string | null> = {
      [LONG_FORM_IDS[0]!]: yesterday,
    };
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions,
      now,
    });
    expect(snap.dueToday).toBe(false);
    expect(snap.pending).toBe(false);
  });
});

describe("completedLongFormsInLocalDay", () => {
  it("ignores submissions outside today local window", () => {
    const now = new Date(2026, 4, 30, 12, 0, 0);
    const yesterday = new Date(2026, 4, 29, 12, 0, 0).toISOString();
    const today = new Date(2026, 4, 30, 9, 0, 0).toISOString();
    const completed = completedLongFormsInLocalDay(
      { pain_intensity_v1: yesterday, psqi_v1: today },
      now.getTime(),
      ["pain_intensity_v1", "psqi_v1"],
    );
    expect(completed).toEqual(["psqi_v1"]);
  });
});

describe("nextLongAssessmentProgramDay", () => {
  const onboarding = "2026-01-01T12:00:00.000Z";

  it("returns day 30 before first milestone", () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    expect(nextLongAssessmentProgramDay(snap.programDay, snap)).toBe(30);
  });

  it("returns today on pending due day", () => {
    const now = new Date(2026, 0, 30, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    expect(nextLongAssessmentProgramDay(snap.programDay, snap)).toBe(30);
  });

  it("returns day 60 after day 30 is complete", () => {
    const now = new Date(2026, 0, 30, 15, 0, 0);
    const submittedAt = new Date(2026, 0, 30, 10, 0, 0).toISOString();
    const lastCompletions = Object.fromEntries(
      LONG_FORM_IDS.map((id) => [id, submittedAt]),
    );
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions,
      now,
    });
    expect(nextLongAssessmentProgramDay(snap.programDay, snap)).toBe(60);
  });

  it("returns day 60 after a missed day 30", () => {
    const now = new Date(2026, 0, 31, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    expect(nextLongAssessmentProgramDay(snap.programDay, snap)).toBe(60);
  });
});

describe("formatLongAssessmentNextOpenLine", () => {
  const onboarding = "2026-01-01T12:00:00.000Z";

  it("includes calendar date and program day before first milestone", () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    const line = formatLongAssessmentNextOpenLine(onboarding, snap, now);
    expect(line).toContain("Day 30");
    expect(line).toMatch(/Next opens/i);
    expect(line).toContain("2026");
  });

  it("uses opens today when due and pending", () => {
    const now = new Date(2026, 0, 30, 12, 0, 0);
    const snap = resolveLongAssessmentState({
      onboardingSubmittedAt: onboarding,
      lastCompletions: {},
      now,
    });
    const line = formatLongAssessmentNextOpenLine(onboarding, snap, now);
    expect(line).toMatch(/Opens today/i);
    expect(line).toContain("Day 30");
  });
});

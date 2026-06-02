import { describe, expect, it } from "vitest";

import { LONG_FORM_IDS } from "./care-program-form-groups";
import type { LongAssessmentSnapshot } from "./long-assessment-eligibility";
import {
  mergeCompletedFormIds,
  reconcileSessionFromSnapshot,
} from "./long-assessment-session-state";

describe("mergeCompletedFormIds", () => {
  it("keeps canonical long form order", () => {
    const merged = mergeCompletedFormIds(
      ["psqi_v1", "pain_intensity_v1"],
      ["fatigue_v1"],
    );
    expect(merged).toEqual([
      "pain_intensity_v1",
      "psqi_v1",
      "fatigue_v1",
    ]);
  });
});

describe("reconcileSessionFromSnapshot", () => {
  const snap: LongAssessmentSnapshot = {
    pending: true,
    programDay: 30,
    dueToday: true,
    completedFormIds: [LONG_FORM_IDS[0]!, LONG_FORM_IDS[1]!],
    remainingFormIds: LONG_FORM_IDS.slice(2),
  };

  it("clears session when program day mismatches", () => {
    const session = reconcileSessionFromSnapshot(
      {
        programDay: 60,
        completedFormIds: [LONG_FORM_IDS[0]!],
        activeFormId: LONG_FORM_IDS[1]!,
      },
      snap,
    );
    expect(session?.programDay).toBe(30);
    expect(session?.completedFormIds).toEqual([
      LONG_FORM_IDS[0],
      LONG_FORM_IDS[1],
    ]);
    expect(session?.activeFormId).toBe(LONG_FORM_IDS[2]);
  });

  it("resumes at active form when still remaining", () => {
    const session = reconcileSessionFromSnapshot(
      {
        programDay: 30,
        completedFormIds: [LONG_FORM_IDS[0]!],
        activeFormId: LONG_FORM_IDS[2]!,
      },
      snap,
    );
    expect(session?.activeFormId).toBe(LONG_FORM_IDS[2]);
  });

  it("returns null when all forms complete for the day", () => {
    const completeSnap: LongAssessmentSnapshot = {
      pending: false,
      programDay: 30,
      dueToday: true,
      completedFormIds: [...LONG_FORM_IDS],
      remainingFormIds: [],
    };
    expect(reconcileSessionFromSnapshot(null, completeSnap)).toBeNull();
  });
});

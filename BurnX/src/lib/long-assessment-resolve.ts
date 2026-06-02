import { getOnboardingSubmittedAt, getLastCompletion } from "./burn-date";
import { LONG_FORM_IDS } from "./care-program-form-groups";
import {
  resolveLongAssessmentState,
  type LongAssessmentSnapshot,
} from "./long-assessment-eligibility";

export async function fetchLongAssessmentLastCompletions(): Promise<
  Record<string, string | null>
> {
  const entries = await Promise.all(
    LONG_FORM_IDS.map(async (id) => [id, await getLastCompletion(id)] as const),
  );
  return Object.fromEntries(entries);
}

export async function resolveLongAssessmentSnapshot(
  now: Date = new Date(),
): Promise<LongAssessmentSnapshot> {
  try {
    const onboardingSubmittedAt = await getOnboardingSubmittedAt();
    const lastCompletions = await fetchLongAssessmentLastCompletions();
    return resolveLongAssessmentState({
      onboardingSubmittedAt,
      lastCompletions,
      now,
    });
  } catch {
    return {
      pending: false,
      programDay: null,
      dueToday: false,
      completedFormIds: [],
      remainingFormIds: [...LONG_FORM_IDS],
    };
  }
}

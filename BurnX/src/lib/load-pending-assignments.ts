import type { FormDefinition } from "../constants/forms";
import { forms } from "../constants/forms";
import { MOCA_FORM_ID, isMocaStandaloneTestingEnabled } from "../constants/forms/moca";
import { LONG_ASSESSMENT_BUNDLE_ID } from "./care-program-form-groups";
import { resolveAssignmentSnapshot } from "./form-assignment-eligibility";
import { resolveLongAssessmentSnapshot } from "./long-assessment-resolve";

/**
 * Pending Care program rows from eligibility (EMA + LIBRE + Long Assessment).
 * Voice check-in is excluded — it lives on the Voice tab.
 *
 * When `formIds` is provided, only those instruments are checked (in parallel).
 */
export async function loadPendingAssignments(
  formIds?: readonly string[],
): Promise<FormDefinition[]> {
  const toCheck: FormDefinition[] =
    formIds !== undefined
      ? formIds
          .map((id) => forms.find((f) => f.id === id))
          .filter((f): f is FormDefinition => f !== undefined)
      : forms;

  const results = await Promise.all(
    toCheck.map(async (f) => {
      try {
        if (isMocaStandaloneTestingEnabled() && f.id === MOCA_FORM_ID) {
          return f;
        }
        if (f.id === LONG_ASSESSMENT_BUNDLE_ID) {
          const snap = await resolveLongAssessmentSnapshot();
          return snap.pending ? f : null;
        }
        const snap = await resolveAssignmentSnapshot(f.id);
        return snap.pending ? f : null;
      } catch {
        return f.id === LONG_ASSESSMENT_BUNDLE_ID ? null : f;
      }
    }),
  );

  return results.filter((f): f is FormDefinition => f !== null);
}

export function filterPendingByFormIds(
  pending: FormDefinition[],
  formIds: readonly string[],
): FormDefinition[] {
  const order = new Map(formIds.map((id, i) => [id, i] as const));
  return pending
    .filter((f) => order.has(f.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

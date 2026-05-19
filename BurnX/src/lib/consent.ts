import {
  getMyFormResponses,
  submitFormResponse,
} from "./api";
import { CONSENT_VERSION } from "../constants/forms/consent";

/** True if the current user has any stored row for the active consent `form_id`. */
export async function hasConsented(): Promise<boolean> {
  const rows = await getMyFormResponses(CONSENT_VERSION, 5);
  return rows.some((r) => r.form_id === CONSENT_VERSION);
}

/**
 * Persist consent as a form response. Only keys with `true` are included (optional checkboxes omitted when false).
 */
export async function recordConsent(
  checkboxValues: Record<string, boolean>,
): Promise<void> {
  const answers: Record<string, unknown> = {
    consent_version: CONSENT_VERSION,
    consent_at: new Date().toISOString(),
  };
  for (const [k, v] of Object.entries(checkboxValues)) {
    if (v) answers[k] = true;
  }
  await submitFormResponse({
    form_id: CONSENT_VERSION,
    answers,
  });
}

export { CONSENT_VERSION } from "../constants/forms/consent";

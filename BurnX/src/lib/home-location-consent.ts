import { getMyFormResponses, submitFormResponse } from "./api";

export const HOME_LOCATION_CONSENT_FORM_ID = "home_location_consent_v1";

export type HomeLocationConsentChecks = {
  understandsNoRouteHistory: boolean;
  understandsHomeBoundary: boolean;
  understandsLocalDelete: boolean;
  agreesToTracking: boolean;
};

export async function hasHomeLocationConsent(): Promise<boolean> {
  const rows = await getMyFormResponses(HOME_LOCATION_CONSENT_FORM_ID, 5);
  return rows.some((row) => row.form_id === HOME_LOCATION_CONSENT_FORM_ID);
}

export async function recordHomeLocationConsent(
  checks: HomeLocationConsentChecks,
): Promise<void> {
  await submitFormResponse({
    form_id: HOME_LOCATION_CONSENT_FORM_ID,
    answers: {
      consent_version: HOME_LOCATION_CONSENT_FORM_ID,
      consent_at: new Date().toISOString(),
      purpose: "Estimate patient time at home and outside home during recovery.",
      data_minimization:
        "NeoTherm does not store route history, maps, pins, or repeated GPS trails for this feature.",
      backend_record_type: "location_tracking_feature_consent",
      ...checks,
    },
  });
}

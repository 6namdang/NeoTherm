import { buildFallbackFormSchedule } from "./ema-schedule-fallback";
import type { FormScheduleResponse } from "./ema-schedule-types";

const CANONICAL_SLOT_IDS = new Set([
  "sleep_am",
  "pain_am",
  "pain_pm",
  "mood_noon",
  "mood_night",
]);

/** True when the API returned the five single-form slots the client expects. */
export function isCanonicalFiveSlotSchedule(
  body: FormScheduleResponse,
): boolean {
  if (body.slots.length !== 5) return false;

  const seen = new Set<string>();
  for (const slot of body.slots) {
    if (!CANONICAL_SLOT_IDS.has(slot.slot_id)) return false;
    if (slot.form_ids.length !== 1) return false;
    if (slot.local_close_time !== "23:59") return false;
    seen.add(slot.slot_id);
  }

  return seen.size === 5;
}

/**
 * Prefer a canonical API schedule; otherwise use the client fallback (legacy grouped slots,
 * wrong close times, or date mismatch would hide open check-ins at e.g. 10:34 AM).
 */
export function normalizeFormSchedule(
  requestedYmd: string,
  apiBody: FormScheduleResponse,
): FormScheduleResponse {
  if (isCanonicalFiveSlotSchedule(apiBody)) {
    return { ...apiBody, date: requestedYmd };
  }
  return buildFallbackFormSchedule(requestedYmd);
}

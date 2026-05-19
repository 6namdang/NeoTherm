import { Platform } from "react-native";

import { ALL_FORMS } from "../constants/forms";
import { deleteStorageItem, setStorageItem } from "./storage";

/**
 * SecureStore keys may contain only `[A-Za-z0-9._-]` (no `:`). We segment with `.`
 * Dynamic segments are **sanitized** so federated / non-UUID `sub` values cannot break iOS Keychain.
 */
export const ASSIGNMENT_LAST_COMPLETED_PREFIX =
  "assignment_last_completed." as const;

function sanitizeNativeKeySegment(segment: string): string {
  return segment.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function assignmentLastCompletedKey(
  sub: string,
  formId: string,
): string {
  return `${ASSIGNMENT_LAST_COMPLETED_PREFIX}${sanitizeNativeKeySegment(sub)}.${sanitizeNativeKeySegment(formId)}`;
}

/** Pre-fix: colon-delimited (invalid on native SecureStore; localStorage only). */
function assignmentLastCompletedKeyLegacy(
  sub: string,
  formId: string,
): string {
  return `assignment_last_completed:${sub}:${formId}`;
}

/**
 * Mirrors server `created_at` after GET, or optimistic client time after POST.
 * `iso` empty/null deletes the cache entry for that `(sub, formId)`.
 */
export async function setAssignmentLastCompletedIso(
  sub: string,
  formId: string,
  iso: string | null | undefined,
): Promise<void> {
  const key = assignmentLastCompletedKey(sub, formId);
  if (
    iso === null ||
    iso === undefined ||
    (typeof iso === "string" && iso.trim() === "")
  ) {
    await deleteStorageItem(key);
    return;
  }
  await setStorageItem(key, iso.trim());
}

const VOICE_CHECKIN_FORM_CACHE_ID = "voice_checkin_v1" as const;

/** Call before wiping auth tokens so we still resolve `sub` from the stored id JWT. */
export async function clearAssignmentCachesForSub(
  sub: string,
): Promise<void> {
  for (const f of ALL_FORMS) {
    await deleteStorageItem(assignmentLastCompletedKey(sub, f.id));
    if (Platform.OS === "web") {
      await deleteStorageItem(assignmentLastCompletedKeyLegacy(sub, f.id));
    }
  }
  await deleteStorageItem(assignmentLastCompletedKey(sub, VOICE_CHECKIN_FORM_CACHE_ID));
  if (Platform.OS === "web") {
    await deleteStorageItem(assignmentLastCompletedKeyLegacy(sub, VOICE_CHECKIN_FORM_CACHE_ID));
  }
}

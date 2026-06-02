import { getMyFormResponses } from "./api";

export type SlotWindowBounds = {
  openMs: number;
  closeMs: number;
};

function parseLocalHm(hm: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

/**
 * Local open/close bounds for a schedule calendar day (`YYYY-MM-DD`).
 * Window is half-open: `[openMs, closeMs)`.
 * `23:59` close means end of that calendar day (exclusive next midnight).
 */
export function windowBoundsMs(
  schedDateYmd: string,
  openHm: string,
  closeHm: string,
): SlotWindowBounds | null {
  const open = parseLocalHm(openHm);
  const close = parseLocalHm(closeHm);
  if (!open || !close) return null;

  const [y, mo, da] = schedDateYmd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
    return null;
  }

  const openMs = new Date(y, mo - 1, da, open.hour, open.minute, 0, 0).getTime();
  const closeMs =
    close.hour === 23 && close.minute === 59
      ? new Date(y, mo - 1, da + 1, 0, 0, 0, 0).getTime()
      : new Date(y, mo - 1, da, close.hour, close.minute, 0, 0).getTime();

  if (!Number.isFinite(openMs) || !Number.isFinite(closeMs) || closeMs <= openMs) {
    return null;
  }

  return { openMs, closeMs };
}

/** Recent `created_at` timestamps for slot-scoped completion checks (2×/day forms). */
export async function fetchRecentCompletionIsos(formId: string): Promise<string[]> {
  const responses = await getMyFormResponses(formId, 10);
  return responses
    .map((row) => row.created_at)
    .filter(
      (at): at is string => typeof at === "string" && at.trim() !== "",
    );
}

/** True when any recent completion falls inside the slot window on `schedDate`. */
export function hasFormCompletionInSlotWindow(
  _formId: string,
  schedDate: string,
  openHm: string,
  closeHm: string,
  recentIsos: readonly string[],
): boolean {
  const wb = windowBoundsMs(schedDate, openHm, closeHm);
  if (!wb) return false;

  for (const iso of recentIsos) {
    const ms = Date.parse(iso.trim());
    if (!Number.isFinite(ms)) continue;
    if (ms >= wb.openMs && ms < wb.closeMs) return true;
  }

  return false;
}

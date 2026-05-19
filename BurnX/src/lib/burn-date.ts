import { getMyFormResponses } from "./api";

const DAY_MS = 1000 * 60 * 60 * 24;

export async function getBurnInjuryDate(): Promise<string | null> {
  const responses = await getMyFormResponses("burn_intake_v1", 1);
  if (responses.length === 0) return null;
  const raw = responses[0]?.answers?.injury_date;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

/** Latest completion timestamp for a given `form_id` (patient-scoped via GET, newest first). */
export async function getLastCompletion(formId: string): Promise<string | null> {
  const responses = await getMyFormResponses(formId, 1);
  if (responses.length === 0) return null;
  const at = responses[0]?.created_at;
  return typeof at === "string" && at.trim() !== "" ? at.trim() : null;
}

/** Full days from `iso` (typically injury date `YYYY-MM-DD`) to `now`. */
export function daysBetween(iso: string, now = new Date()): number {
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  return Math.floor(ms / DAY_MS);
}

function formatInjuryForDisplay(isoLike: string): string {
  const t = isoLike.trim();
  if (t === "") return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

/**
 * Text for the recall chip above questionnaire items.
 * - **No prior submission** for this `form_id`: “Since your burn injury (date)” when injury date exists, else “Since your burn injury”.
 * - **After at least one submission**: “In the last N days” from last completion → now (N ≥ 1).
 */
export function buildFormRecallPeriodLabel(
  injuryDate: string | null,
  lastCompletedAt: string | null,
  now: Date = new Date(),
): string {
  const hasLast =
    typeof lastCompletedAt === "string" &&
    lastCompletedAt.trim() !== "";

  if (!hasLast) {
    const inj = injuryDate?.trim() ?? "";
    if (inj !== "") {
      const formatted = formatInjuryForDisplay(inj);
      return `Since your burn injury (${formatted})`;
    }
    return "Since your burn injury";
  }

  const lastMs = Date.parse(lastCompletedAt!.trim());
  if (!Number.isFinite(lastMs)) {
    const inj = injuryDate?.trim() ?? "";
    if (inj !== "") {
      const formatted = formatInjuryForDisplay(inj);
      return `Since your burn injury (${formatted})`;
    }
    return "Since your burn injury";
  }

  const diffMs = now.getTime() - lastMs;
  const days = Math.max(1, Math.floor(diffMs / DAY_MS));
  if (days === 1) return "In the last day";
  return `In the last ${days} days`;
}

/** @deprecated Use `buildFormRecallPeriodLabel` */
export function buildBurnHeader(
  injuryDate: string | null,
  lastCompletedAt: string | null,
): string {
  return buildFormRecallPeriodLabel(injuryDate, lastCompletedAt);
}

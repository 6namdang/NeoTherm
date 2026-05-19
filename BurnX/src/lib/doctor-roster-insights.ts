import type { DoctorPatientRow } from "./api";

export type RosterSummary = {
  total: number;
  /** Submitted any form in the last 7 days. */
  activeLast7d: number;
  /** No `last_form_at`, or last activity ≥14 days ago. */
  needsFollowUp: number;
  /** `created_at` within last 30 days. */
  newEnrolled30d: number;
};

export type PatientSortMode = "activity" | "name" | "injury";

export type PatientFilterMode = "all" | "active7" | "followup";

const MS_DAY = 86_400_000;

function ms(iso: string | null): number | null {
  if (!iso || iso.trim() === "") return null;
  const t = Date.parse(iso.trim());
  return Number.isFinite(t) ? t : null;
}

export function computeRosterSummary(
  patients: readonly DoctorPatientRow[],
): RosterSummary {
  const now = Date.now();
  const d7 = now - 7 * MS_DAY;
  const d14 = now - 14 * MS_DAY;
  const d30 = now - 30 * MS_DAY;

  let activeLast7d = 0;
  let needsFollowUp = 0;
  let newEnrolled30d = 0;

  for (const p of patients) {
    const last = ms(p.last_form_at);
    if (last !== null && last >= d7) activeLast7d += 1;
    if (last === null || last < d14) needsFollowUp += 1;

    const created = ms(p.created_at);
    if (created !== null && created >= d30) newEnrolled30d += 1;
  }

  return {
    total: patients.length,
    activeLast7d,
    needsFollowUp,
    newEnrolled30d,
  };
}

function injMs(iso: string | null): number {
  const raw = iso?.trim() ?? "";
  if (!raw) return NaN;
  const t = raw.includes("T") ? Date.parse(raw) : Date.parse(`${raw}T12:00:00`);
  return Number.isFinite(t) ? t : NaN;
}

export function sortPatients(
  patients: DoctorPatientRow[],
  mode: PatientSortMode,
): DoctorPatientRow[] {
  const copy = [...patients];
  if (mode === "name") {
    copy.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return copy;
  }
  if (mode === "injury") {
    copy.sort((a, b) => {
      const ta = injMs(a.injury_date);
      const tb = injMs(b.injury_date);
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
      if (!Number.isFinite(ta)) return 1;
      if (!Number.isFinite(tb)) return -1;
      return tb - ta;
    });
    return copy;
  }
  // activity (most recent first; nulls last)
  copy.sort((a, b) => {
    const ma = ms(a.last_form_at);
    const mb = ms(b.last_form_at);
    if (ma === null && mb === null) return a.name.localeCompare(b.name);
    if (ma === null) return 1;
    if (mb === null) return -1;
    return mb - ma;
  });
  return copy;
}

export function filterPatients(
  patients: readonly DoctorPatientRow[],
  query: string,
  mode: PatientFilterMode,
): DoctorPatientRow[] {
  const q = query.trim().toLowerCase();
  const now = Date.now();
  const d7 = now - 7 * MS_DAY;
  const d14 = now - 14 * MS_DAY;

  return patients.filter((p) => {
    if (q !== "" && !p.name.toLowerCase().includes(q)) return false;

    const last = ms(p.last_form_at);
    if (mode === "active7") {
      return last !== null && last >= d7;
    }
    if (mode === "followup") {
      return last === null || last < d14;
    }
    return true;
  });
}

/** Recency bucket for badges (not clinical priority). */
export type ActivityBucket = "fresh" | "week" | "aging" | "stale" | "none";

export function activityBucket(p: DoctorPatientRow): ActivityBucket {
  const last = ms(p.last_form_at);
  if (last === null) return "none";
  const ago = Date.now() - last;
  if (ago < 48 * 3_600_000) return "fresh";
  if (ago < 7 * MS_DAY) return "week";
  if (ago < 14 * MS_DAY) return "aging";
  return "stale";
}

export function formatRosterSyncedLabel(ts: number | null): string | null {
  if (ts === null) return null;
  const delta = Date.now() - ts;
  if (delta < 90_000) return "Roster synced just now";
  const min = Math.floor(delta / 60_000);
  if (min < 60) return `Roster synced ${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Roster synced ${hr} hr ago`;
  try {
    return `Roster synced ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ts))}`;
  } catch {
    return "Roster synced";
  }
}

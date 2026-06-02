import { hospitals } from "../constants/hospitals";
import type { MeResponse } from "./api";

const DAY_MS = 86_400_000;

export function titleCaseRole(role: string): string {
  const t = role.trim();
  if (t === "") return "";
  return t
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Display name for facility subline: `me.facility` or hospital brand/name. */
export function resolveWelcomeFacility(
  me: MeResponse | null | undefined,
): string | null {
  const direct = typeof me?.facility === "string" ? me.facility.trim() : "";
  if (direct !== "") return direct;

  const hospitalId =
    typeof me?.hospital_id === "string" ? me.hospital_id.trim() : "";
  if (hospitalId === "") return null;

  const hospital = hospitals.find((h) => h.id === hospitalId);
  if (!hospital) return null;
  return hospital.brandName ?? hospital.name;
}

/** Display role: `me.role`, else clinician `title`, else session fallback label. */
export function resolveWelcomeRole(
  me: MeResponse | null | undefined,
  fallback: "patient" | "clinician",
): string | null {
  const role = typeof me?.role === "string" ? me.role.trim() : "";
  if (role !== "") return role;

  if (fallback === "clinician") {
    const title = typeof me?.title === "string" ? me.title.trim() : "";
    if (title !== "") return title;
  }

  return fallback;
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (typeof iso !== "string" || iso.trim() === "") return null;
  const ms = Date.parse(iso.trim());
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Whole days since last visit / activity.
 * Prefers `me.last_visit_at`, then newest timestamp in `activityIsos`.
 */
export function resolveLastVisitDaysAgo(
  me: MeResponse | null | undefined,
  activityIsos: readonly string[] = [],
): number | null {
  const candidates: number[] = [];

  const serverVisit = parseIsoMs(me?.last_visit_at);
  if (serverVisit !== null) candidates.push(serverVisit);

  for (const iso of activityIsos) {
    const ms = parseIsoMs(iso);
    if (ms !== null) candidates.push(ms);
  }

  if (candidates.length === 0) return null;

  const latest = Math.max(...candidates);
  return Math.max(0, Math.floor((Date.now() - latest) / DAY_MS));
}

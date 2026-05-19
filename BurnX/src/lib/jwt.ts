import { getStorageItem } from "./storage";

/** Decode Cognito JWT payload (no signature verification — trust SecureStore origin only). */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = globalThis.atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type AuthRoleClaim = "patient" | "doctor";

function firstRoleClaimString(payload: Record<string, unknown>): string | undefined {
  for (const key of ["custom:role", "custom_role", "role"] as const) {
    const v = payload[key];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return undefined;
}

/** Map JWT role claim → patient | doctor (Cognito: casing, synonyms, alternate keys). */
export function parseRoleFromPayload(payload: Record<string, unknown> | null): AuthRoleClaim | null {
  if (!payload) return null;
  const raw = firstRoleClaimString(payload);
  if (!raw) return null;
  const n = raw.trim().toLowerCase();
  if (
    n === "doctor" ||
    n === "clinician" ||
    n === "physician" ||
    n === "provider"
  )
    return "doctor";
  if (n === "patient") return "patient";
  return null;
}

export async function getSubjectFromStoredIdToken(): Promise<string | null> {
  const idToken = await getStorageItem("idToken");
  if (!idToken) return null;
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;
  const sub = payload.sub;
  if (sub === undefined || sub === null) return null;
  const s = String(sub).trim();
  return s !== "" ? s : null;
}

export async function getRoleFromStoredIdToken(): Promise<AuthRoleClaim | null> {
  const idToken = await getStorageItem("idToken");
  if (!idToken) return null;
  return parseRoleFromPayload(decodeJwtPayload(idToken));
}

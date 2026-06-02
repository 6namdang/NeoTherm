import { Platform } from "react-native";

import { API_BASE_URL } from "../../aws-config";
import { getValidIdToken, refreshSession } from "./auth";
import { bxLog } from "./debug-log";
import type { FormScheduleResponse } from "./ema-schedule-types";

function apiHostHint(): string {
  try {
    return new URL(API_BASE_URL).host;
  } catch {
    return "configured server URL";
  }
}

function isConnectivityFailure(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("network error")
  );
}

/**
 * When `fetch()` never receives a HTTP response — offline, TLS/DNS failures, firewall, browser CORS, etc.
 * Browsers literally throw TypeError `Failed to fetch`.
 */
export function explainReachabilityError(error: unknown): string {
  if (!isConnectivityFailure(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  const isWeb = Platform.OS === "web";
  const webHint = isWeb
    ? " If you're in a browser, try again or switch to the mobile app. Ask IT if the NeoTherm server address is correct."
    : "";

  return (
    `We couldn't reach NeoTherm (${apiHostHint()}). ` +
    "Check your Wi-Fi, cellular data, or VPN." +
    webHint
  );
}

async function doAuthFetchAttempt(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const method = init.method ?? "GET";
  const url = `${API_BASE_URL}${path}`;

  const token = await getValidIdToken();
  if (!token) {
    bxLog("api", "authFetch aborted: no id token");
    throw new Error("Please sign in again.");
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };

  bxLog("api", "fetch", { method, path });
  try {
    return await fetch(url, { ...init, headers });
  } catch (caught) {
    bxLog("api", "fetch rejected (reachability)", {
      path,
      url,
      message: caught instanceof Error ? caught.message : String(caught),
    });
    throw new Error(explainReachabilityError(caught));
  }
}

export type MeResponse = {
  onboarding_completed: boolean;
  name?: string;
  hospital_id?: string;
  /** Optional display facility from GET /me (falls back to hospital catalog). */
  facility?: string;
  /** Optional role label from GET /me (falls back to JWT / profile title). */
  role?: string;
  /** Optional last clinical visit or app engagement timestamp (ISO). */
  last_visit_at?: string;
  /** Clinician profile when returned by GET /me. */
  title?: string;
  specialty?: string;
  department?: string;
};

/** Roster row from GET /hospital/patients (doctor JWT only). */
export type DoctorPatientRow = {
  patient_id: string;
  name: string;
  injury_date: string | null;
  last_form_at: string | null;
  last_form_summary: string | null;
  created_at: string;
};

export type CreateMeBody = {
  name: string;
  hospital_id: string;
  /** Physician profile — forwarded when present (JWT role enforced server-side). */
  title?: string;
  specialty?: string;
  department?: string;
};

/** Lambda expects snake_case in JSON body. */
export type FormResponsePayload = {
  form_id: string;
  answers: Record<string, unknown>;
};

/** Stored questionnaire submission row (GET /form-responses envelope). */
export type FormResponse = {
  hospital_id: string;
  sk: string;
  patient_id: string;
  created_at: string;
  response_id: string;
  form_id: string;
  answers: Record<string, unknown>;
};

type FormResponsesListBody = {
  items?: FormResponse[];
  count?: number;
};

function parseFormResponsesListBody(payload: unknown): FormResponse[] {
  const body = payload as FormResponsesListBody;
  const items = body.items;
  return Array.isArray(items) ? items : [];
}

function coerceHospitalPatients(payload: unknown): {
  patients: DoctorPatientRow[];
  count: number;
} {
  if (typeof payload !== "object" || payload === null) {
    return { patients: [], count: 0 };
  }
  const raw = payload as {
    patients?: unknown;
    count?: unknown;
  };
  const arr = raw.patients;
  const patients = Array.isArray(arr)
    ? arr
        .map((row): DoctorPatientRow | null => {
          if (typeof row !== "object" || row === null) return null;
          const o = row as Record<string, unknown>;
          const pid =
            typeof o.patient_id === "string"
              ? o.patient_id.trim()
              : typeof o.patient_id === "number"
                ? String(o.patient_id).trim()
                : "";
          const nameRaw = o.name;
          const name =
            typeof nameRaw === "string"
              ? nameRaw.trim()
              : typeof nameRaw === "number"
                ? String(nameRaw).trim()
                : "";
          if (pid === "" || name === "") return null;
          const inj =
            o.injury_date === null
              ? null
              : typeof o.injury_date === "string"
                ? o.injury_date.trim() || null
                : null;
          const lf =
            o.last_form_at === null
              ? null
              : typeof o.last_form_at === "string"
                ? o.last_form_at.trim() || null
                : null;
          const summ =
            o.last_form_summary === null || o.last_form_summary === undefined
              ? null
              : typeof o.last_form_summary === "string"
                ? o.last_form_summary
                : null;
          let craRaw = "";
          if (typeof o.created_at === "string") {
            craRaw = o.created_at.trim();
          } else if (typeof o.created_at === "number" && Number.isFinite(o.created_at)) {
            craRaw = new Date(o.created_at).toISOString();
          }
          return {
            patient_id: pid,
            name,
            injury_date: inj,
            last_form_at: lf,
            last_form_summary: summ,
            created_at: craRaw === "" ? new Date(0).toISOString() : craRaw,
          };
        })
        .filter((x): x is DoctorPatientRow => x !== null)
    : [];
  const cn = raw.count;
  const count =
    typeof cn === "number" && Number.isFinite(cn) ? cn : patients.length;
  return { patients, count };
}

/**
 * Authorized fetch: uses Cognito **id token** (same JWT your Lambda likely reads for `custom:*` claims).
 * On 401, forces one refresh + retry (handles clock skew and near-expiry during long onboarding).
 */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? "GET";
  bxLog("api", "request", { method, path });

  let response = await doAuthFetchAttempt(path, init);
  bxLog("api", "response", { path, method, status: response.status });
  if (response.status === 401) {
    bxLog("api", "401 → refreshSession + retry", { path });
    try {
      await refreshSession();
    } catch {
      throw new Error(
        "Your session expired. Sign out, sign in again, then try once more.",
      );
    }
    response = await doAuthFetchAttempt(path, init);
    bxLog("api", "response after refresh", { path, method, status: response.status });
  }
  return response;
}

async function readErrorMessage(response: Response): Promise<string> {
  const status = response.status;
  const rawText = await response.text();
  let detail = "";

  if (rawText) {
    try {
      const body = JSON.parse(rawText) as Record<string, unknown>;
      const msg =
        (typeof body.message === "string" && body.message) ||
        (typeof body.Message === "string" && body.Message) ||
        (typeof body.error === "string" && body.error) ||
        (typeof body.detail === "string" && body.detail);
      if (msg) {
        detail = msg;
      } else {
        detail = rawText.trim().slice(0, 800);
      }
    } catch {
      detail = rawText.trim().slice(0, 800);
    }
  }

  if (status === 401) {
    return detail || "Your sign-in may have expired. Sign out, then sign in again.";
  }

  if (status === 400) {
    return detail || "The request could not be accepted. Please check required fields.";
  }

  if (status === 403) {
    return detail || "You don't have permission for this action. Contact your administrator if you think this is a mistake.";
  }

  if (detail) return detail;
  return `Something went wrong (error ${status}). Try again shortly.`;
}

/** 404 → null (no users row yet). */
export async function getMe(): Promise<MeResponse | null> {
  bxLog("api", "getMe() start");
  const response = await authFetch("/me", { method: "GET" });
  if (response.status === 404) {
    bxLog("api", "getMe → 404 (no row)");
    return null;
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const data = (await response.json()) as MeResponse;
  bxLog("api", "getMe → ok", data);
  return data;
}

export async function createMe(body: CreateMeBody): Promise<void> {
  const payload: Record<string, string | undefined> = {
    name: body.name,
    hospital_id: body.hospital_id,
  };
  if (body.title !== undefined && body.title !== "") {
    payload.title = body.title;
  }
  if (body.specialty !== undefined && body.specialty !== "") {
    payload.specialty = body.specialty;
  }
  if (body.department !== undefined && body.department !== "") {
    payload.department = body.department;
  }
  bxLog("api", "createMe()", {
    hospital_id: body.hospital_id,
    keys: Object.keys(payload),
  });
  const response = await authFetch("/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  bxLog("api", "createMe → ok");
}

/** Permanently deletes the signed-in user's profile and associated server-side patient data. */
export async function deleteMe(): Promise<void> {
  bxLog("api", "deleteMe()");
  const response = await authFetch("/me", { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  bxLog("api", "deleteMe → ok");
}

export async function submitFormResponse(payload: FormResponsePayload): Promise<unknown> {
  bxLog("api", "submitFormResponse()", {
    form_id: payload.form_id,
    answerKeys: Object.keys(payload.answers),
    answerCount: Object.keys(payload.answers).length,
  });
  const response = await authFetch("/form-responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const json = await response.json().catch(() => ({}));
  bxLog("api", "submitFormResponse → ok", json);
  return json;
}

export type VoiceUploadUrls = {
  session_id: string;
  urls: Record<string, { url: string; key: string }>;
};

export async function getVoiceUploadUrls(): Promise<VoiceUploadUrls> {
  bxLog("api", "getVoiceUploadUrls()");
  const response = await authFetch("/voice/upload-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const data = (await response.json()) as VoiceUploadUrls;
  if (
    typeof data.session_id !== "string" ||
    data.session_id.trim() === "" ||
    typeof data.urls !== "object" ||
    data.urls === null
  ) {
    throw new Error("Voice upload URLs response was missing session_id or urls.");
  }
  bxLog("api", "getVoiceUploadUrls → ok");
  return data;
}

export async function submitVoiceSession(params: {
  session_id: string;
  s3_keys: string[];
  nrs_pain?: number;
}): Promise<{ success: boolean; session_id: string }> {
  bxLog("api", "submitVoiceSession()", { session_id: params.session_id, n: params.s3_keys.length });
  const response = await authFetch("/voice/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: params.session_id,
      s3_keys: params.s3_keys,
      ...(params.nrs_pain !== undefined ? { nrs_pain: params.nrs_pain } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const json = (await response.json()) as { success?: boolean; session_id?: string };
  bxLog("api", "submitVoiceSession → ok", json);
  return {
    success: Boolean(json.success),
    session_id: typeof json.session_id === "string" ? json.session_id : params.session_id,
  };
}

export type MeAssignmentsResponse = {
  submissions: Record<string, string | null>;
};

function normalizeAssignmentsSubmissions(raw: unknown): Record<string, string | null> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (typeof v === "string") {
      out[k] = v.trim() === "" ? null : v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      const ms = Math.abs(v) < 1e12 ? v * 1000 : v;
      const iso = new Date(ms).toISOString();
      out[k] = Number.isFinite(Date.parse(iso)) ? iso : null;
    } else if (typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      const cand =
        typeof o.completed_at === "string"
          ? o.completed_at
          : typeof o.last_submitted_at === "string"
            ? o.last_submitted_at
            : typeof o.submitted_at === "string"
              ? o.submitted_at
              : null;
      const t = cand?.trim() ?? "";
      out[k] = t === "" ? null : t;
    } else {
      out[k] = null;
    }
  }
  return out;
}

export async function getMeAssignments(): Promise<MeAssignmentsResponse> {
  bxLog("api", "getMeAssignments()");
  const response = await authFetch("/me/assignments", { method: "GET" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const body = (await response.json()) as { submissions?: unknown };
  const submissions = normalizeAssignmentsSubmissions(body?.submissions);
  bxLog("api", "getMeAssignments → ok", {
    keys: Object.keys(submissions).length,
  });
  return { submissions };
}

export async function getFormSchedule(params: {
  date: string;
  tz_offset_min: number;
}): Promise<FormScheduleResponse> {
  bxLog("api", "getFormSchedule()", params);
  const q = new URLSearchParams({
    date: params.date,
    tz_offset_min: String(params.tz_offset_min),
  });
  const response = await authFetch(`/form-schedule?${q.toString()}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const body = (await response.json()) as FormScheduleResponse;
  if (typeof body.date !== "string" || !Array.isArray(body.slots)) {
    throw new Error("Unexpected /form-schedule response shape.");
  }
  for (const slot of body.slots) {
    if (
      typeof slot.slot_id !== "string" ||
      !Array.isArray(slot.form_ids) ||
      typeof slot.local_open_time !== "string" ||
      typeof slot.local_close_time !== "string" ||
      typeof slot.n1_utc !== "string"
    ) {
      throw new Error("Unexpected /form-schedule slot shape.");
    }
  }
  bxLog("api", "getFormSchedule → ok", {
    date: body.date,
    slots: body.slots.length,
  });
  return body;
}

export type { FormScheduleResponse, FormScheduleSlot } from "./ema-schedule-types";

/**
 * Latest-first list of this patient's submissions (JWT-scoped server-side).
 * Query: optional form_id filter, limit page size (default 50).
 */
export async function getMyFormResponses(
  formId?: string,
  limit = 50,
): Promise<FormResponse[]> {
  const query = new URLSearchParams();
  if (formId) query.set("form_id", formId);
  query.set("limit", String(limit));
  const path = `/form-responses?${query.toString()}`;
  bxLog("api", "getMyFormResponses", { formId, limit });
  const response = await authFetch(path, { method: "GET" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const body = await response.json();
  return parseFormResponsesListBody(body);
}

/** Doctor-only: roster for clinician's hospital from GET /hospital/patients. */
export async function getHospitalPatients(): Promise<{
  patients: DoctorPatientRow[];
  count: number;
}> {
  bxLog("api", "getHospitalPatients");
  const response = await authFetch("/hospital/patients", { method: "GET" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const body = await response.json();
  const coerced = coerceHospitalPatients(body);
  bxLog("api", "getHospitalPatients → ok", { count: coerced.count });
  return coerced;
}

/**
 * Doctor-only: a patient's questionnaire submissions (`FormResponse[]`),
 * same envelope as GET /form-responses with optional filters.
 */
export async function getPatientFormResponses(params: {
  patientId: string;
  formId?: string;
  limit?: number;
  /** Abort slow/hung roster expansions (doctor dashboard). Default 55s. */
  timeoutMs?: number;
}): Promise<FormResponse[]> {
  const { patientId, formId, limit = 240, timeoutMs = 55_000 } = params;
  const enc = encodeURIComponent(patientId);
  const query = new URLSearchParams();
  if (formId) query.set("form_id", formId);
  query.set("limit", String(limit));
  const qs = query.toString();
  const path = `/hospital/patients/${enc}/form-responses${qs !== "" ? `?${qs}` : ""}`;
  bxLog("api", "getPatientFormResponses", { patientId, formId, limit });

  const controller = new AbortController();
  const useTimeout =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0;
  const tid = useTimeout
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await authFetch(path, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const body = await response.json();
    return parseFormResponsesListBody(body);
  } catch (e) {
    const aborted =
      (typeof e === "object" &&
        e !== null &&
        "name" in e &&
        (e as { name?: string }).name === "AbortError") ||
      (e instanceof Error && e.message.toLowerCase().includes("aborted"));
    if (aborted) {
      throw new Error(
        "Loading questionnaire scores timed out. Check your connection, collapse and expand the row, or pull to refresh the roster.",
      );
    }
    throw e;
  } finally {
    if (tid !== null) clearTimeout(tid);
  }
}

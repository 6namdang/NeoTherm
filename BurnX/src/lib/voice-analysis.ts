import { getSubjectFromStoredIdToken } from "./jwt";

const DEFAULT_VOICE_ANALYSIS_LIMIT = 7;

const voiceAnalysisUrlFromEnv =
  typeof process !== "undefined" &&
  typeof process.env?.EXPO_PUBLIC_VOICE_ANALYSIS_URL === "string"
    ? process.env.EXPO_PUBLIC_VOICE_ANALYSIS_URL.trim()
    : "";

export const VOICE_ANALYSIS_BASE_URL = voiceAnalysisUrlFromEnv.replace(/\/$/, "");

export type VoiceAnalysisMetrics = {
  voice_stability: number | null;
  speech_pace: number | null;
  speech_flow: number | null;
};

export type VoiceAnalysisSession = {
  hospital_id: string;
  patient_id: string;
  session_id: string;
  recorded_at: string;
  processed_at: string | null;
  features: VoiceAnalysisMetrics | null;
  task_status: Record<string, string>;
  error: string | null;
};

type VoiceSessionsBody = {
  items?: unknown;
  count?: unknown;
};

function numberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function stringOrEmpty(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function stringOrNull(value: unknown): string | null {
  const text = stringOrEmpty(value);
  return text === "" ? null : text;
}

function parseMetrics(value: unknown): VoiceAnalysisMetrics | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const metrics = {
    voice_stability: numberOrNull(raw.voice_stability),
    speech_pace: numberOrNull(raw.speech_pace),
    speech_flow: numberOrNull(raw.speech_flow),
  };
  return Object.values(metrics).some((item) => item !== null) ? metrics : null;
}

function parseTaskStatus(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const text = stringOrEmpty(raw);
    if (key.trim() !== "" && text !== "") {
      out[key] = text;
    }
  }
  return out;
}

function parseSession(value: unknown): VoiceAnalysisSession | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const sessionId = stringOrEmpty(raw.session_id);
  const recordedAt = stringOrEmpty(raw.recorded_at);
  const patientId = stringOrEmpty(raw.patient_id);
  const hospitalId = stringOrEmpty(raw.hospital_id);
  if (sessionId === "" || recordedAt === "" || patientId === "") return null;
  return {
    hospital_id: hospitalId,
    patient_id: patientId,
    session_id: sessionId,
    recorded_at: recordedAt,
    processed_at: stringOrNull(raw.processed_at),
    features: parseMetrics(raw.features),
    task_status: parseTaskStatus(raw.task_status),
    error: stringOrNull(raw.error),
  };
}

export async function loadVoiceAnalysisSessions(
  limit = DEFAULT_VOICE_ANALYSIS_LIMIT,
): Promise<VoiceAnalysisSession[]> {
  if (VOICE_ANALYSIS_BASE_URL === "") {
    throw new Error(
      "Set EXPO_PUBLIC_VOICE_ANALYSIS_URL to your Mac's local FastAPI URL.",
    );
  }

  const patientId = await getSubjectFromStoredIdToken();
  if (!patientId) {
    throw new Error("Sign in again before loading voice analysis.");
  }

  const query = new URLSearchParams({
    patient_id: patientId,
    limit: String(limit),
  });
  const response = await fetch(
    `${VOICE_ANALYSIS_BASE_URL}/voice/sessions?${query.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Voice analysis service returned ${response.status}.`);
  }
  const body = (await response.json()) as VoiceSessionsBody;
  const items = Array.isArray(body.items) ? body.items : [];
  return items
    .map(parseSession)
    .filter((item): item is VoiceAnalysisSession => item !== null);
}

import {
  BURN_INTAKE_FORM,
  PATIENT_ONBOARDING_FORM,
  type Question,
} from "../constants/forms/onboarding";
import { hospitals } from "../constants/hospitals";
import { getMyFormResponses, type FormResponse } from "./api";
import { isQuestionVisible } from "./question-visibility";

export type PatientProfileRow = {
  label: string;
  value: string;
};

export type PatientProfileSection = {
  id: string;
  title: string;
  description?: string;
  rows: PatientProfileRow[];
};

export type PatientIntakeRecord = {
  submittedAt: string | null;
  answers: Record<string, unknown>;
};

function hospitalLabelForId(id: unknown): string {
  if (typeof id !== "string" || id.trim() === "") return "—";
  return hospitals.find((h) => h.id === id.trim())?.name ?? "Burn center on file";
}

function formatDateValue(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim() === "") return "—";
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return raw.trim();
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
  } catch {
    return raw.trim();
  }
}

function formatMultiSelect(raw: unknown): string {
  if (Array.isArray(raw)) {
    const items = raw.map(String).filter((s) => s.trim() !== "");
    return items.length > 0 ? items.join(", ") : "—";
  }
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  return "—";
}

function formatIntakeAnswerValue(question: Question, raw: unknown): string {
  if (raw === undefined || raw === null) return "—";

  switch (question.type) {
    case "boolean":
      return raw === true ? "Yes" : raw === false ? "No" : "—";
    case "number": {
      const n =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
            ? Number(raw)
            : NaN;
      if (!Number.isFinite(n)) return "—";
      return question.unit ? `${n} ${question.unit}` : String(n);
    }
    case "date":
      return formatDateValue(raw);
    case "time":
      return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : "—";
    case "multi_select":
      return formatMultiSelect(raw);
    case "hospital_picker":
      return hospitalLabelForId(raw);
    case "text":
    case "single_select":
    case "scale":
      if (typeof raw === "string") return raw.trim() === "" ? "—" : raw.trim();
      if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
      return String(raw);
    default:
      return String(raw);
  }
}

function rowsForQuestions(
  questions: Question[],
  answers: Record<string, unknown>,
): PatientProfileRow[] {
  const rows: PatientProfileRow[] = [];
  for (const q of questions) {
    if (!isQuestionVisible(q, answers)) continue;
    const raw = answers[q.id];
    if (raw === undefined || raw === null) continue;
    rows.push({
      label: q.label,
      value: formatIntakeAnswerValue(q, raw),
    });
  }
  return rows;
}

/** Profile step (GET /me) + burn intake sections for the patient Profile tab. */
export function buildPatientProfileSections(params: {
  name?: string | null;
  hospitalId?: string | null;
  intakeAnswers: Record<string, unknown>;
}): PatientProfileSection[] {
  const profileAnswers: Record<string, unknown> = {
    name: params.name ?? "",
    hospital_id: params.hospitalId ?? "",
  };

  const sections: PatientProfileSection[] = [];

  for (const section of PATIENT_ONBOARDING_FORM.sections) {
    const rows = rowsForQuestions(section.questions, profileAnswers);
    if (rows.length === 0) continue;
    sections.push({
      id: section.id,
      title: section.title,
      description: PATIENT_ONBOARDING_FORM.description,
      rows,
    });
  }

  for (const section of BURN_INTAKE_FORM.sections) {
    const rows = rowsForQuestions(section.questions, params.intakeAnswers);
    if (rows.length === 0) continue;
    sections.push({
      id: section.id,
      title: section.title,
      description: section.description,
      rows,
    });
  }

  return sections;
}

export function formatPatientIntakeSubmittedAt(iso: string | null | undefined): string | null {
  if (typeof iso !== "string" || iso.trim() === "") return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso.trim();
  }
}

/** Latest `burn_intake_v1` submission for the signed-in patient (JWT-scoped GET). */
export async function loadPatientIntakeRecord(): Promise<PatientIntakeRecord | null> {
  const responses = await getMyFormResponses(BURN_INTAKE_FORM.id, 10);
  const sorted = [...responses].sort(
    (a, b) =>
      Date.parse(String(b.created_at ?? 0)) -
      Date.parse(String(a.created_at ?? 0)),
  );
  const latest = sorted[0];
  if (!latest) return null;
  return {
    submittedAt: latest.created_at ?? null,
    answers: latest.answers ?? {},
  };
}

export function intakeRecordFromResponse(response: FormResponse | undefined): PatientIntakeRecord | null {
  if (!response) return null;
  return {
    submittedAt: response.created_at ?? null,
    answers: response.answers ?? {},
  };
}

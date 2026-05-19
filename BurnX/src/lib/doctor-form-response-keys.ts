import type { FormResponse } from "./api";

/** Stable identity for list keys and dedupe (API rows may omit `response_id`). */
export function stableSubmissionKey(sub: FormResponse, index: number): string {
  const rid = typeof sub.response_id === "string" ? sub.response_id.trim() : "";
  if (rid !== "") return rid;
  const sk = typeof sub.sk === "string" ? sub.sk.trim() : "";
  if (sk !== "") return sk;
  const created = typeof sub.created_at === "string" ? sub.created_at.trim() : "";
  return `${created}|${sub.form_id}|${index}`;
}

export function dedupeFormResponses(rows: readonly FormResponse[]): FormResponse[] {
  const out: FormResponse[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const rid = typeof r.response_id === "string" ? r.response_id.trim() : "";
    const sk = typeof r.sk === "string" ? r.sk.trim() : "";
    const composite =
      rid !== ""
        ? `rid:${rid}`
        : sk !== ""
          ? `sk:${sk}`
          : `t:${String(r.created_at ?? "")}|${String(r.form_id ?? "")}`;
    if (seen.has(composite)) continue;
    seen.add(composite);
    out.push(r);
  }
  return out;
}

export function submissionMatchesForm(sub: FormResponse, formId: string): boolean {
  return String(sub.form_id ?? "").trim() === String(formId ?? "").trim();
}

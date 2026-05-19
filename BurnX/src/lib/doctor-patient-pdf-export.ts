import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getFormById } from "../constants/forms";
import type { FormResponse } from "./api";
import { formatClinicianAnswerRows } from "./doctor-form-answer-format";
import { summarizeFormResponseForScoreboard } from "./doctor-patient-scoreboard";
import { dedupeFormResponses } from "./doctor-form-response-keys";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formDisplayTitle(formId: string): string {
  const f = getFormById(formId);
  const n = (f?.name ?? "").trim();
  return n !== "" ? n : formId;
}

function formatUtcStamp(iso: string): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(t));
  } catch {
    return iso;
  }
}

export function buildPatientQuestionnaireExportHtml(params: {
  patientName: string;
  patientId: string;
  responses: FormResponse[];
  generatedAtIso: string;
}): string {
  const { patientName, patientId, responses, generatedAtIso } = params;
  const unique = dedupeFormResponses(responses);
  const sorted = [...unique].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );

  const hospitalSample =
    sorted.find((r) => typeof r.hospital_id === "string" && r.hospital_id.trim() !== "")
      ?.hospital_id ?? "";

  const submissionBlocks = sorted
    .map((sub, idx) => {
      const answers =
        sub.answers && typeof sub.answers === "object"
          ? (sub.answers as Record<string, unknown>)
          : {};
      const headline = summarizeFormResponseForScoreboard(sub.form_id, answers);
      const rows = formatClinicianAnswerRows(sub.form_id, answers);
      const fid = escapeHtml(sub.form_id);
      const title = escapeHtml(formDisplayTitle(sub.form_id));
      const when = escapeHtml(formatUtcStamp(sub.created_at));
      const rid =
        typeof sub.response_id === "string" && sub.response_id.trim() !== ""
          ? escapeHtml(sub.response_id.trim())
          : escapeHtml(sub.sk ?? `row-${idx}`);
      const headlineHtml =
        headline !== null
          ? `<p class="score"><strong>Headline score</strong> ${escapeHtml(headline)}</p>`
          : `<p class="score muted">Headline score not computed for this submission.</p>`;

      const tableRows =
        rows.length === 0
          ? `<tr><td colspan="2" class="muted">No structured answers stored.</td></tr>`
          : rows
              .map(
                (r) =>
                  `<tr><td class="q">${escapeHtml(r.label)}</td><td class="a">${escapeHtml(r.value)}</td></tr>`,
              )
              .join("");

      return `
<section class="submission">
  <h2>${title}</h2>
  <p class="meta"><span class="pill">${fid}</span> · Submitted <strong>${when}</strong> UTC · Response <code>${rid}</code></p>
  ${headlineHtml}
  <table>
    <thead><tr><th>Question</th><th>Response</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</section>`;
    })
    .join("\n");

  const emptyNotice =
    sorted.length === 0
      ? `<p class="notice"><strong>No responses</strong> were included in this export (reload questionnaire data and try again).</p>`
      : "";

  const genLabel = escapeHtml(formatUtcStamp(generatedAtIso));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(`BurnX export · ${patientName}`)}</title>
  <style>
    :root {
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --fill: #f8fafc;
      --accent: #1d6ea6;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: var(--text);
      line-height: 1.45;
      margin: 0;
      padding: 36px 44px 48px;
      font-size: 11pt;
      background: #fff;
    }
    header.cover {
      border-bottom: 2px solid var(--accent);
      padding-bottom: 16px;
      margin-bottom: 28px;
    }
    header.cover h1 { margin: 0 0 8px; font-size: 18pt; letter-spacing: -0.02em; }
    header.cover .subtitle { margin: 0; color: var(--muted); font-size: 10pt; }
    dl.meta {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 6px 16px;
      font-size: 10pt;
      margin: 16px 0 8px;
    }
    dl.meta dt { color: var(--muted); margin: 0; }
    dl.meta dd { margin: 0; font-weight: 600; }
    .muted { color: var(--muted); }
    .notice {
      padding: 14px;
      border-radius: 10px;
      background: var(--fill);
      border: 1px solid var(--border);
      margin-bottom: 18px;
    }
    section.submission {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    section.submission:last-child { border-bottom: none; }
    section.submission h2 {
      margin: 0 0 8px;
      font-size: 13pt;
      color: var(--accent);
    }
    .meta { margin: 0 0 10px; font-size: 9.5pt; color: var(--muted); }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--fill);
      border: 1px solid var(--border);
      font-family: ui-monospace, monospace;
      font-size: 9pt;
    }
    code { font-family: ui-monospace, monospace; font-size: 9pt; background: var(--fill); padding: 1px 6px; border-radius: 4px; }
    .score { margin: 8px 0 12px; font-size: 10.5pt; }
    .score.muted { color: var(--muted); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 9px 10px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: var(--fill);
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }
    td.q { width: 52%; color: #334155; }
    td.a { font-weight: 600; color: var(--text); }
    footer.disclaimer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px dashed var(--border);
      font-size: 9pt;
      color: var(--muted);
    }
    @media print {
      body { padding: 24px 32px; }
    }
  </style>
</head>
<body>
  <header class="cover">
    <h1>BurnX questionnaire export</h1>
    <p class="subtitle">Full dump of loaded responses · Verify against source documentation before clinical use.</p>
    <dl class="meta">
      <dt>Patient name</dt><dd>${escapeHtml(patientName)}</dd>
      <dt>Patient ID</dt><dd>${escapeHtml(patientId)}</dd>
      ${hospitalSample ? `<dt>Hospital ID</dt><dd>${escapeHtml(String(hospitalSample))}</dd>` : ""}
      <dt>Responses included</dt><dd>${sorted.length}</dd>
      <dt>Generated (UTC)</dt><dd>${genLabel}</dd>
    </dl>
  </header>
  ${emptyNotice}
  ${submissionBlocks}
  <footer class="disclaimer">
    Confidential · Contains PHI-class questionnaire content · Distribution subject to hospital policy and applicable regulations (e.g. HIPAA).
    This file reflects only submissions present in BurnX at export time (history may be capped by sync limits).
  </footer>
</body>
</html>`;
}

export type PdfExportResult =
  | { kind: "native_pdf"; uri: string; shared: boolean }
  | { kind: "web_print_tab" };

/**
 * Builds a printable/PDF report from every loaded submission for the patient (all programmes / dates in `responses`).
 */
export async function exportPatientQuestionnairePdf(params: {
  patientName: string;
  patientId: string;
  responses: FormResponse[];
}): Promise<PdfExportResult> {
  const { patientName, patientId, responses } = params;
  const generatedAtIso = new Date().toISOString();
  const html = buildPatientQuestionnaireExportHtml({
    patientName,
    patientId,
    responses,
    generatedAtIso,
  });

  const unique = dedupeFormResponses(responses);
  if (unique.length === 0) {
    throw new Error("No questionnaire responses loaded yet — expand the patient row first.");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, "_blank", "noopener,noreferrer");
      if (!tab) {
        URL.revokeObjectURL(url);
        throw new Error(
          "Pop-up blocked. Allow pop-ups for this site, then export again — use Print → Save as PDF.",
        );
      }
      tab.focus();
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    }
    return { kind: "web_print_tab" };
  }

  const file = await Print.printToFileAsync({
    html,
    margins: { left: 36, right: 36, top: 42, bottom: 42 },
  });

  let shared = false;
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Save or share questionnaire PDF",
      ...(Platform.OS === "ios" ? { UTI: "com.adobe.pdf" as const } : {}),
    });
    shared = true;
  }

  return { kind: "native_pdf", uri: file.uri, shared };
}

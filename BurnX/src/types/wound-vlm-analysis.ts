/**
 * Parsed from `wound_images.vlm_analysis` (GPT-4o vision). Backend may evolve — use guards when reading.
 */

export type WoundVlmAnalysisScores = {
  burn_severity: number | null;
  tissue_health: number | null;
  infection_risk: number | null;
  inflammation: number | null;
  healing_progress: number | null;
};

export type WoundVlmAnalysisSuccess = {
  image_quality: { is_clear: boolean; issues: string[] };
  wound_visible: boolean;
  scores: WoundVlmAnalysisScores;
  score_explanation: string;
  patient_friendly_summary: string;
  requires_clinician_attention: boolean;
  attention_reasons: string[];
};

export type WoundVlmAnalysisFailure = {
  error: true;
  error_type: string;
  error_message: string;
  failed_at: string;
};

export type WoundVlmAnalysis = WoundVlmAnalysisSuccess | WoundVlmAnalysisFailure;

export function isVlmFailure(v: unknown): v is WoundVlmAnalysisFailure {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    (v as { error?: unknown }).error === true
  );
}

export function isVlmSuccess(v: unknown): v is WoundVlmAnalysisSuccess {
  if (isVlmFailure(v)) return false;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { patient_friendly_summary?: unknown }).patient_friendly_summary === "string"
  );
}

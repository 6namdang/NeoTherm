import type { WoundImage } from "./api";

/**
 * True when the backend has finished processing (either timestamp set or any VLM payload stored).
 * Some APIs set `vlm_analysis` before `processed_at`; without this, the UI would spin forever.
 */
export function woundProcessingComplete(row: WoundImage): boolean {
  if (row.processed_at !== null && row.processed_at.trim() !== "") return true;
  if (row.vlm_analysis !== null) return true;
  return false;
}

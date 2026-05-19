import type { PsqiDomainId } from "../lib/psqi-scoring";

/** Seven PSQI components — one distinct accent each (columns + labels). */
export const PSQI_DOMAIN_ACCENT: Record<PsqiDomainId, string> = {
  durat: "#2563EB",
  distb: "#7C3AED",
  laten: "#DB2777",
  daydys: "#EA580C",
  hse: "#059669",
  sq: "#B45309",
  meds: "#5B21B6",
};

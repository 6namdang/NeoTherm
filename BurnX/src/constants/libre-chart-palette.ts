import type { LibreRadarSectionId } from "../lib/libre-scoring";

/** Per-domain bar gradients — mirrors multi-hue Bravo-style breakdown (not spider blue). */
export const LIBRE_DOMAIN_BAR_GRADIENT: Record<
  LibreRadarSectionId,
  readonly [top: string, bottom: string]
> = {
  family_friends: ["#34D399", "#059669"],
  social_interactions: ["#60D8F0", "#0EA5BF"],
  social_activities: ["#A78BFA", "#6D28D9"],
  work: ["#818CF8", "#4338CA"],
  romantic: ["#FB923C", "#C2410C"],
  sexual: ["#FB7185", "#BD3039"],
} as const;

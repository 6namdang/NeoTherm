export type EmaLikertPolarity = "higherIsBetter" | "lowerIsBetter";

const GRADIENT_STOPS: readonly { t: number; r: number; g: number; b: number }[] = [
  { t: 0, r: 239, g: 68, b: 68 },
  { t: 0.33, r: 249, g: 115, b: 22 },
  { t: 0.66, r: 234, g: 179, b: 8 },
  { t: 1, r: 34, g: 197, b: 94 },
];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = negative (red end), 1 = positive (green end). */
export function valenceFromLikertValue(
  value: number,
  polarity: EmaLikertPolarity,
): number {
  const clamped = Math.min(10, Math.max(0, value));
  return polarity === "higherIsBetter" ? clamped / 10 : (10 - clamped) / 10;
}

/** Thumb position on track: 0 = left, 1 = right (always negative → positive visually). */
export function trackPositionFromLikertValue(
  value: number,
  polarity: EmaLikertPolarity,
): number {
  return valenceFromLikertValue(value, polarity);
}

/** Map touch position (0–1, left→right) to stored Likert index 0–10. */
export function likertValueFromTrackPosition(
  position: number,
  polarity: EmaLikertPolarity,
): number {
  const pct = clamp01(position);
  const valence = pct;
  const raw =
    polarity === "higherIsBetter" ? valence * 10 : (1 - valence) * 10;
  return Math.round(raw);
}

export function colorFromValence(valence: number): string {
  const v = clamp01(valence);
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i += 1) {
    const left = GRADIENT_STOPS[i]!;
    const right = GRADIENT_STOPS[i + 1]!;
    if (v <= right.t) {
      const span = right.t - left.t || 1;
      const local = (v - left.t) / span;
      const r = Math.round(lerp(left.r, right.r, local));
      const g = Math.round(lerp(left.g, right.g, local));
      const b = Math.round(lerp(left.b, right.b, local));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = GRADIENT_STOPS[GRADIENT_STOPS.length - 1]!;
  return `rgb(${last.r}, ${last.g}, ${last.b})`;
}

export function colorFromLikertValue(
  value: number,
  polarity: EmaLikertPolarity,
): string {
  return colorFromValence(valenceFromLikertValue(value, polarity));
}

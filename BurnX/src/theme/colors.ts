/**
 * Clinical enterprise palette — soft neutrals, restrained blue accents.
 * Aligned with modern SaaS (Linear / Stripe) without consumer playfulness.
 */
export const colors = {
  /** Page canvas — near-white with a hint of neutrality (.cards stay pure `surface`). */
  background: "#FAFAFA",
  backgroundAlt: "#F2F3F5",
  /** Primary content surfaces */
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  surfaceSubtle: "#FAFBFC",

  overlay: "rgba(15, 23, 42, 0.04)",
  overlayStrong: "rgba(15, 23, 42, 0.07)",

  /** Accent — restrained clinical blue */
  primary: "#1D6EA6",
  primaryPressed: "#155A87",
  primarySoft: "#E8F1F8",
  primaryForeground: "#FFFFFF",
  ring: "rgba(29, 110, 166, 0.35)",

  accent: "#0F172A",
  accentMuted: "#334155",

  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textOnPrimary: "#FFFFFF",

  border: "#E5EAF0",
  borderStrong: "#CBD5E1",
  divider: "#EEF2F6",

  success: "#047857",
  successSoft: "#D1FAE5",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  /** Informational stripes (trust / audit cues) */
  info: "#1D6EA6",
  infoSoft: "#E8F1F8",

  white: "#FFFFFF",
  shadow: "#0F172A",

  /** Home dashboard chart shells: pure white so they read above the tinted page canvas (`background`). */
  chartCard: "#FFFFFF",
  /** MGH-style institutional green for chart titles (LIBRE, Fatigue, PSQI, etc.); tune to official brand specs if needed. */
  chartCardTitle: "#043D37",

  /** Apple-style system semantics (dashboard / Health-parity widgets) */
  systemRed: "#FF453A",
  systemOrange: "#FF9500",
  systemGreen: "#34C759",
  systemGray: "#8E8E93",
  systemGray2: "#AEAEB2",
  systemGray3: "#C7C7CC",
  systemGray6: "#F2F2F7",

  tabBar: "#FAFBFC",
  tabBarBorder: "#E8EDF3",
} as const;

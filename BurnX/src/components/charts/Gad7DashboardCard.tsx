/**
 * Home card: **GAD-7** anxiety total with an iOS-style semicircular gauge (Swift Charts / Fitness-like arc).
 */

import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IosSemiGauge } from "./IosSemiGauge";
import {
  GAD7_TOTAL_MAX,
  gad7SeverityFromTotal,
  type Gad7DashboardSnapshot,
  type Gad7Severity,
} from "../../lib/gad7-scoring";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const CARD = {
  fg: "#0F172A",
  muted: "#64748B",
} as const;

const SEVERITY_LABEL: Record<Gad7Severity, string> = {
  minimal: "Minimal anxiety symptom burden",
  mild: "Mild symptom burden common in primary care populations",
  moderate: "Moderate — consider informing your care team if new or worsening",
  severe: "Marked burden — orientation only; not a diagnosis by itself",
};

const SEVERITY_ACCENT: Record<Gad7Severity, { main: string; soft: string }> = {
  minimal: {
    main: colors.systemGreen,
    soft: "#5AD98E",
  },
  mild: {
    main: "#FFCC02",
    soft: "#FFDA47",
  },
  moderate: {
    main: colors.systemOrange,
    soft: "#FFBA66",
  },
  severe: {
    main: colors.systemRed,
    soft: "#FF7668",
  },
};

function formatSubmitted(iso: string | null): string | null {
  if (iso === null || typeof iso !== "string" || iso.trim() === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

type Props = { snapshot: Gad7DashboardSnapshot | null };

export function Gad7DashboardCard({ snapshot }: Props) {
  const submittedLine = useMemo(
    () => formatSubmitted(snapshot?.createdAtIso ?? null),
    [snapshot?.createdAtIso],
  );

  const complete = snapshot?.isComplete === true && snapshot.total !== null;
  const total = snapshot?.total ?? null;
  const severity =
    complete && total !== null ? gad7SeverityFromTotal(total) : null;
  const palette =
    severity !== null ? SEVERITY_ACCENT[severity] : SEVERITY_ACCENT.minimal;

  function announceInterpretation(): void {
    const s = severity ?? ("minimal" as Gad7Severity);
    const phrase = `${SEVERITY_LABEL[s]} Total score ${total !== null ? String(total) : "not computed"} of ${GAD7_TOTAL_MAX}.`;
    void AccessibilityInfo.announceForAccessibility(phrase);
  }

  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Pressable
        accessibilityHint="Reads a plain-language interpretation hint for your latest GAD-7 total"
        accessibilityLabel="GAD-7 anxiety card header"
        accessibilityRole="button"
        android_ripple={{ color: "rgba(15,23,42,0.06)", foreground: false }}
        onPress={announceInterpretation}
        style={({ pressed }) => [
          styles.chromePressable,
          pressed && Platform.OS === "ios" && { opacity: 0.92 },
        ]}
      >
        <View style={styles.headerStack}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerLeft}>
              <Ionicons
                color={colors.chartCardTitle}
                name="alert-circle-outline"
                size={20}
              />
              <Text style={[typography.title, styles.headerTitle]}>GAD-7 anxiety</Text>
            </View>
          </View>
          <Text style={[styles.captionMetaBelow, typography.micro]}>
            Weekly screen · Sum 0–{String(GAD7_TOTAL_MAX)}
          </Text>
        </View>
        <Text style={[styles.subcaption, typography.caption]}>
          Over the recall window above each question — higher totals mean anxiety symptoms bothered you more often.
          For clinical interpretation, share results with your care team.
        </Text>
        {submittedLine ? (
          <Text style={[styles.submittedStamp, typography.micro]}>Submitted {submittedLine}</Text>
        ) : (
          <Text style={[styles.submittedMuted, typography.micro]}>
            Complete GAD-7 once it appears under Assignments to see your gauge here.
          </Text>
        )}
      </Pressable>

      <View style={styles.gaugeWrap}>
        <IosSemiGauge
          accentColor={palette.main}
          accentSoft={palette.soft}
          maxValue={GAD7_TOTAL_MAX}
          tickTotals={[5, 10, 15]}
          value={total}
        />
        <View style={styles.gaugeMetricBlock}>
          <Text accessibilityRole="text" style={styles.scoreHuge}>
            {total !== null ? String(total) : "–"}
          </Text>
          <Text style={[styles.bandTag, typography.caption]}>
            {complete && severity !== null
              ? SEVERITY_LABEL[severity]
              : "Complete all seven items for a summed score"}
          </Text>
        </View>
      </View>

      <Text style={[styles.footerNote, typography.caption]}>
        Standard cut-points for research and primary care clinics: totals 5, 10, and 15 act as checkpoints along the
        arc. This visualization is informational, not a substitute for clinician judgment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: 22,
    backgroundColor: colors.chartCard,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    paddingHorizontal: 18,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md + 4,
    gap: spacing.sm + 2,
    marginBottom: spacing.xxl,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: "visible",
  },
  chromePressable: {
    borderRadius: 14,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingBottom: spacing.xs + 2,
    gap: spacing.sm + 2,
  },
  headerStack: {
    alignSelf: "stretch",
    gap: spacing.xs + 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    flexShrink: 1,
  },
  headerTitle: {
    color: colors.chartCardTitle,
    letterSpacing: -0.35,
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
  },
  captionMetaBelow: {
    color: CARD.muted,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    textAlign: "left",
  },
  subcaption: {
    color: CARD.muted,
    fontWeight: "500",
    lineHeight: 20,
  },
  submittedStamp: {
    color: CARD.fg,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.35,
    marginTop: 2,
    marginBottom: 2,
  },
  submittedMuted: {
    color: CARD.muted,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "500",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 2,
  },
  gaugeWrap: {
    alignItems: "center",
    width: "100%",
    marginTop: spacing.xs,
  },
  gaugeMetricBlock: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scoreHuge: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.4,
    color: CARD.fg,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  bandTag: {
    color: CARD.muted,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  footerNote: {
    color: colors.textMuted,
    lineHeight: 20,
    fontWeight: "500",
    marginTop: spacing.sm,
  },
});

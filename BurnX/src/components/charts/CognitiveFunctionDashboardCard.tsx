/**
 * Home card: Cognitive symptom screen totals with Fitness-style gauge (Apple-native arc language).
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
  COGNITIVE_TOTAL_MAX,
  cognitiveSeverityFromTotal,
  type CognitiveBurdenSeverity,
  type CognitiveDashboardSnapshot,
} from "../../lib/cognitive-function-scoring";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const CARD = {
  fg: "#0F172A",
  muted: "#64748B",
} as const;

const SEVERITY_LABEL: Record<CognitiveBurdenSeverity, string> = {
  low: "Few concentration or clarity episodes in your reporting window",
  mild: "Some cognitive symptoms — tracking over time matters more than any single score",
  moderate: "Frequent bothersome symptoms noted — tell your clinician if interfering with routines",
  high: "High burden in this snippet — correlate with fatigue, meds, stress, and recovery stage",
};

const SEVERITY_ACCENT: Record<CognitiveBurdenSeverity, { main: string; soft: string }> = {
  low: {
    main: "#0A84FF",
    soft: "#5EB0FF",
  },
  mild: {
    main: "#32D74B",
    soft: "#6EE787",
  },
  moderate: {
    main: colors.systemOrange,
    soft: "#FFBA66",
  },
  high: {
    main: "#BF5AF2",
    soft: "#D894FA",
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

type Props = { snapshot: CognitiveDashboardSnapshot | null };

export function CognitiveFunctionDashboardCard({ snapshot }: Props) {
  const submittedLine = useMemo(
    () => formatSubmitted(snapshot?.createdAtIso ?? null),
    [snapshot?.createdAtIso],
  );

  const complete = snapshot?.isComplete === true && snapshot.total !== null;
  const total = snapshot?.total ?? null;
  const severity =
    complete && total !== null ? cognitiveSeverityFromTotal(total) : null;
  const palette =
    severity !== null ? SEVERITY_ACCENT[severity] : SEVERITY_ACCENT.low;

  function announceInterpretation(): void {
    const s = severity ?? ("low" as CognitiveBurdenSeverity);
    const phrase = `${SEVERITY_LABEL[s]} Total signal ${total !== null ? String(total) : "not computed"} of ${COGNITIVE_TOTAL_MAX}.`;
    void AccessibilityInfo.announceForAccessibility(phrase);
  }

  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Pressable
        accessibilityHint="Reads descriptive context for how BurnX summarizes these cognitive symptom items"
        accessibilityLabel="Cognitive function dashboard card header"
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
                name="bulb-outline"
                size={20}
              />
              <Text style={[typography.title, styles.headerTitle]}>
                Cognitive function
              </Text>
            </View>
          </View>
          <Text style={[styles.captionMetaBelow, typography.micro]}>
            Weekly screen · Burden score 0–{String(COGNITIVE_TOTAL_MAX)}
          </Text>
        </View>
        <Text style={[styles.subcaption, typography.caption]}>
          Four frequency items aligned with PROM-style cognition screens — higher summed scores mean troubling
          thinking or concentration issues occurred more often in this reporting window (not IQ).
        </Text>
        {submittedLine ? (
          <Text style={[styles.submittedStamp, typography.micro]}>Submitted {submittedLine}</Text>
        ) : (
          <Text style={[styles.submittedMuted, typography.micro]}>
            Complete Cognitive function when assigned to visualize your trajectory here.
          </Text>
        )}
      </Pressable>

      <View style={styles.gaugeWrap}>
        <IosSemiGauge
          accentColor={palette.main}
          accentSoft={palette.soft}
          maxValue={COGNITIVE_TOTAL_MAX}
          tickTotals={[4, 8, 12]}
          value={total}
        />
        <View style={styles.gaugeMetricBlock}>
          <Text accessibilityRole="text" style={styles.scoreHuge}>
            {total !== null ? String(total) : "–"}
          </Text>
          <Text style={[styles.bandTag, typography.caption]}>
            {complete && severity !== null
              ? SEVERITY_LABEL[severity]
              : "Fill all prompts for a summed burden metric"}
          </Text>
        </View>
      </View>

      <Text style={[styles.footerNote, typography.caption]}>
        Arc ticks cue evenly spaced thirds of the maximal raw sum (clinical trials often monitor change over weeks).
        Interpret alongside sleep, fatigue, and medication changes.
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
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    shadowColor: "#000000",
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

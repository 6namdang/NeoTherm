/**
 * PROMIS Pain Intensity 3a. Header opens education sheet; scored body opens average-pain history.
 */

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  PainIntensityDashboardPoint,
  PainIntensityDashboardSnapshot,
  PainIntensitySeverity,
} from "../../lib/pain-intensity-scoring";
import { PainIntensityEducationModal } from "./PainIntensityEducationModal";
import { PainIntensityHistoryModal } from "./PainIntensityHistoryModal";
import { AnimatedScaleTrack } from "./ui/AnimatedScaleTrack";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

const SCALE_MIN = 30;
const SCALE_MAX = 85;
const TICK_VALUES = [55, 60, 70];

/** Bar fill: low T (left) → high T (right), same continuum as fatigue home scale. */
const BAR_H = 6;

const HEALTH_ACCENT = colors.systemRed;

const fontSans = Platform.select({
  ios: "System",
  android: undefined,
});

const SEVERITY_LABEL: Record<PainIntensitySeverity, string> = {
  none: "None, below typical cutoff",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

/** none / mild / moderate / severe → Apple-style green / amber / amber / red (per spec cues). */
const SEVERITY_STYLE: Record<
  PainIntensitySeverity,
  { text: string; fillRgba: string }
> = {
  none: { text: colors.systemGreen, fillRgba: "rgba(52, 199, 89, 0.15)" },
  mild: { text: colors.systemOrange, fillRgba: "rgba(255, 149, 0, 0.15)" },
  moderate: { text: colors.systemOrange, fillRgba: "rgba(255, 149, 0, 0.15)" },
  severe: { text: colors.systemRed, fillRgba: "rgba(255, 69, 58, 0.15)" },
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

function ci95HalfWidth(se: number): number {
  return Math.round(se * 1.96 * 10) / 10;
}

type Props = {
  snapshot: PainIntensityDashboardSnapshot | null;
  history: PainIntensityDashboardPoint[];
};

export function PainIntensityScoreCard({
  snapshot,
  history,
}: Props) {
  const [educationOpen, setEducationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const submittedLine = useMemo(
    () => formatSubmitted(snapshot?.createdAtIso ?? null),
    [snapshot?.createdAtIso],
  );

  const complete = snapshot?.isComplete === true && snapshot.tScore !== null;
  const tScore = snapshot?.tScore ?? null;
  const severity = snapshot?.severity ?? null;
  const se = snapshot?.standardError ?? null;
  const animateKey = snapshot?.createdAtIso ?? "pain-empty";

  const latestOrdinal = history[0] ?? null;

  const runPressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(opacityAnim, {
        toValue: 0.95,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runPressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(opacityAnim, {
        toValue: 1,
        friction: 6,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        accessibilityHint="Opens a guide to PROMIS Pain Intensity and your latest scores"
        accessibilityLabel="Pain intensity header. Open guide"
        accessibilityRole="button"
        android_ripple={{ color: "rgba(0,0,0,0.06)", foreground: false }}
        onPress={() => setEducationOpen(true)}
        style={({ pressed }) => [styles.pressableChrome, pressed && Platform.OS === "ios" && { opacity: 0.94 }]}
      >
        <View style={styles.headerStack}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.titleText}>Pain intensity</Text>
            <View style={styles.headerMetaIcons}>
              <Ionicons
                accessibilityElementsHidden
                color={colors.chartCardTitle}
                importantForAccessibility="no"
                name="information-circle-outline"
                size={20}
              />
              <Ionicons
                accessibilityElementsHidden
                color={HEALTH_ACCENT}
                importantForAccessibility="no"
                name="thermometer-outline"
                size={22}
              />
            </View>
          </View>
          <Text style={styles.subtitleText}>PROMIS Pain Intensity 3a · 30–85 T-score</Text>
        </View>
        {submittedLine ? (
          <Text style={styles.dateText}>Submitted {submittedLine}</Text>
        ) : (
          <Text style={styles.dateTextMuted}>
            Complete the questionnaire to see your latest T-score.
          </Text>
        )}
      </Pressable>

      <Text style={styles.chromeHint}>
        Tap header for PROMIS Pain Intensity details. Tap scores for average pain history.
      </Text>

      <Pressable
        accessibilityHint="Opens a chart of average pain intensity over time"
        accessibilityLabel="Pain intensity chart. Open history chart"
        accessibilityRole="button"
        android_ripple={{ color: "rgba(0,0,0,0.06)", foreground: true }}
        onPress={() => setHistoryOpen(true)}
        onPressIn={runPressIn}
        onPressOut={runPressOut}
        style={({ pressed }) => [styles.pressableBody, pressed && Platform.OS === "ios" && { opacity: 1 }]}
      >

        {!snapshot ? (
          <Text style={styles.emptyBody}>No Pain intensity submission on record yet.</Text>
        ) : !complete ? (
          <Text style={styles.emptyBody}>
            {snapshot.rawScore !== null &&
            snapshot.rawScore !== undefined &&
            snapshot.tScore === null
              ? "Pain intensity score could not be computed from the latest submission. Ensure all three items use valid responses."
              : "All three PROMIS Pain Intensity items must be answered with valid responses to compute a T-score."}
          </Text>
        ) : (
          <>
            <View style={styles.valueRow}>
              <Text style={styles.tScoreText}>
                {tScore !== null ? Math.round(tScore * 10) / 10 : "n/a"}
              </Text>
              {severity ? (
                <View
                  style={[
                    styles.severityPill,
                    { backgroundColor: SEVERITY_STYLE[severity].fillRgba },
                  ]}
                >
                  <Text style={[styles.severityPillText, { color: SEVERITY_STYLE[severity].text }]}>
                    {SEVERITY_LABEL[severity]}
                  </Text>
                </View>
              ) : null}
            </View>

            {se !== null ? (
              <Text style={styles.metaRow}>
                PROMIS T-score · 95% CI ±{ci95HalfWidth(se)}
              </Text>
            ) : null}

            <View style={styles.trackSection}>
              <AnimatedScaleTrack
                animateKey={animateKey}
                barHeight={BAR_H}
                compact
                dotColor={HEALTH_ACCENT}
                renderTick={(tick, leftPx, pct) => (
                  <View
                    key={tick}
                    pointerEvents="none"
                    style={[
                      styles.tickBar,
                      leftPx !== null
                        ? { left: leftPx, marginLeft: -1 }
                        : { left: `${pct * 100}%` as `${number}%`, marginLeft: -1 },
                    ]}
                  />
                )}
                scaleMax={SCALE_MAX}
                scaleMin={SCALE_MIN}
                showScaleLabels={false}
                tScore={tScore}
                tickValues={TICK_VALUES}
              />
              <View style={styles.trackAxis}>
                <Text style={styles.axisEnd}>{SCALE_MIN}</Text>
                <Text style={styles.axisEnd}>{SCALE_MAX}</Text>
              </View>
              <Text accessibilityRole="text" style={styles.gradientLegend}>
                Green on the left means lower pain; red on the right means higher pain.
              </Text>
            </View>

            <Text style={styles.footerText}>Higher score indicates more pain</Text>
          </>
        )}
      </Pressable>

      <PainIntensityEducationModal
        latestOrdinal={latestOrdinal}
        onClose={() => setEducationOpen(false)}
        snapshot={snapshot}
        visible={educationOpen}
      />
      <PainIntensityHistoryModal
        history={history}
        onClose={() => setHistoryOpen(false)}
        visible={historyOpen}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: spacing.xxl,
    borderRadius: 16,
    backgroundColor: colors.chartCard,
    overflow: "hidden",
  },
  pressableChrome: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: spacing.sm + 4,
    gap: 10,
  },
  pressableBody: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: spacing.xs,
    gap: 10,
  },
  headerStack: {
    gap: 6,
    alignSelf: "stretch",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  headerMetaIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    flexShrink: 0,
  },
  chromeHint: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: "500",
    color: colors.systemGray,
    paddingHorizontal: 20,
    marginBottom: spacing.xs,
    lineHeight: 17,
  },
  titleText: {
    fontFamily: fontSans,
    fontSize: 17,
    fontWeight: "600",
    color: colors.chartCardTitle,
    letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
    flexShrink: 1,
  },
  subtitleText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "500",
    color: colors.systemGray,
    letterSpacing: 0.15,
  },
  dateText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "400",
    color: colors.systemGray,
    marginTop: 2,
  },
  dateTextMuted: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "400",
    color: colors.systemGray2,
    fontStyle: "italic",
    marginTop: 2,
  },
  emptyBody: {
    fontFamily: fontSans,
    fontSize: 15,
    fontWeight: "400",
    color: colors.systemGray,
    lineHeight: 22,
    marginTop: 8,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  tScoreText: {
    fontFamily: fontSans,
    fontSize: 34,
    fontWeight: "600",
    color: "#000000",
    fontVariant: ["tabular-nums"],
    letterSpacing: Platform.OS === "ios" ? -0.5 : 0,
  },
  severityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "center",
  },
  severityPillText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "400",
    color: colors.systemGray,
    marginTop: 4,
  },
  trackSection: {
    marginTop: 16,
    gap: 8,
  },
  tickBar: {
    position: "absolute",
    top: "50%",
    marginTop: -7,
    width: 2,
    height: 14,
    backgroundColor: colors.systemGray3,
    borderRadius: 1,
  },
  gradientLegend: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.systemGray,
    lineHeight: 15,
    marginTop: 4,
  },
  trackAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisEnd: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: "500",
    color: colors.systemGray3,
    fontVariant: ["tabular-nums"],
  },
  footerText: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: "400",
    color: colors.systemGray,
    textAlign: "center",
    marginTop: 14,
  },
});

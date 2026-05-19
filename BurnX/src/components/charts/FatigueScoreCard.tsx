/**
 * PROMIS Fatigue 7a. Home snapshot: T-score, severity band, and 30 to 80 reference scale
 * with severity cutoffs at 55 / 60 / 70. Layout parallels PsqiSleepQualityCard.
 */

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { FatigueEducationModal } from "./FatigueEducationModal";
import type { FatigueDashboardSnapshot, FatigueSeverity } from "../../lib/fatigue-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const CARD = {
  fg: "#0F172A",
  muted: "#64748B",
};

const SCALE_MIN = 30;
const SCALE_MAX = 80;
const SCALE_SPAN = SCALE_MAX - SCALE_MIN;
const TICKS = [55, 60, 70];

/** Bar fill: low T (less fatigue, left) → high T (more fatigue, right). */
const GRAD_COLORS = {
  low: "#22C55E",
  mid: "#F59E0B",
  high: "#DC2626",
} as const;

const BAR_H = 14;
const BAR_R = BAR_H / 2;

const SEVERITY_LABEL: Record<FatigueSeverity, string> = {
  none: "None, below typical cutoff",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

const SEVERITY_COLOR: Record<
  FatigueSeverity,
  { text: string; soft: string }
> = {
  none: { text: colors.success, soft: colors.successSoft },
  mild: { text: "#B45309", soft: colors.warningSoft },
  moderate: { text: colors.warning, soft: colors.warningSoft },
  severe: { text: colors.danger, soft: colors.dangerSoft },
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

function pctFromTScore(t: number): number {
  const c = Math.min(SCALE_MAX, Math.max(SCALE_MIN, t));
  return ((c - SCALE_MIN) / SCALE_SPAN) * 100;
}

type Props = {
  snapshot: FatigueDashboardSnapshot | null;
};

const TICK_LABEL_OFFSET_X = 14;

export function FatigueScoreCard({ snapshot }: Props) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [educationOpen, setEducationOpen] = useState(false);
  const [trackBarWidth, setTrackBarWidth] = useState(0);
  const [trackLayoutWidth, setTrackLayoutWidth] = useState(0);
  const gradientId = useMemo(
    () => `fatigueTScale_${Math.random().toString(36).slice(2, 11)}`,
    [],
  );
  const submittedLine = useMemo(
    () => formatSubmitted(snapshot?.createdAtIso ?? null),
    [snapshot?.createdAtIso],
  );

  const complete = snapshot?.isComplete === true && snapshot.tScore !== null;
  const tScore = snapshot?.tScore ?? null;
  const severity = snapshot?.severity ?? null;
  const se = snapshot?.standardError ?? null;

  /** ~horizontal gap between 55 and 60 markers (~10% of scale); shrink labels on narrow cards. */
  const tickApproxGapPx = trackLayoutWidth * 0.1;
  const tickLabelFontSize = Math.max(
    8,
    Math.min(
      11,
      Math.round(
        (tickApproxGapPx < 26 ? 9.75 : tickApproxGapPx < 34 ? 10.25 : 11) /
          Math.min(Math.max(fontScale, 1), 1.35),
      ),
    ),
  );
  const tickTranslateX =
    TICK_LABEL_OFFSET_X * Math.min(fontScale, 1.25);
  const tickLabelMaxWidth = Math.min(
    44,
    Math.max(26, Math.floor(Math.min(windowWidth, 620) / 14)),
  );

  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Pressable
        accessibilityHint="Opens a guide to PROMIS Fatigue scoring and scale"
        accessibilityLabel="Fatigue card header. Open guide"
        accessibilityRole="button"
        android_ripple={{ color: "rgba(15,23,42,0.06)", foreground: false }}
        onPress={() => setEducationOpen(true)}
        style={({ pressed }) => [
          styles.chromePressable,
          pressed && styles.chromePressed,
        ]}
      >
        <View style={styles.headerStack}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerLeft}>
              <Ionicons color={colors.chartCardTitle} name="pulse-outline" size={20} />
              <Text style={[typography.title, styles.headerTitle]}>Fatigue</Text>
            </View>
            <Ionicons
              accessibilityElementsHidden
              color={CARD.muted}
              importantForAccessibility="no"
              name="information-circle-outline"
              size={20}
            />
          </View>
          <Text style={[styles.captionMetaBelow, typography.micro]}>
            PROMIS Fatigue 7a · T-score
          </Text>
        </View>
        <Text style={[styles.subcaption, typography.caption]}>
          Higher T-score indicates more fatigue. Reference scale 30 to 80; markers show common severity boundaries (55 /
          60 / 70).
        </Text>
        {submittedLine ? (
          <Text style={[styles.submittedStamp, typography.micro]}>Submitted {submittedLine}</Text>
        ) : (
          <Text style={[styles.submittedMuted, typography.micro]}>
            Complete the Fatigue questionnaire to see your T-score here.
          </Text>
        )}
      </Pressable>

      <Text style={[styles.chartHint, typography.caption]}>
        Tap the header for PROMIS fatigue details and how BurnX computes your snapshot.
      </Text>

      {!snapshot ? (
        <Text style={[styles.emptyBody, typography.body]}>
          No Fatigue submission on record yet.
        </Text>
      ) : !complete ? (
        <Text style={[styles.emptyBody, typography.body]}>
          {snapshot.rawScore !== null &&
          snapshot.rawScore !== undefined &&
          snapshot.tScore === null
            ? `Raw sum (${snapshot.rawScore}) could not be matched to the PROMIS Fatigue 7a table. Complete all seven items with valid responses.`
            : "All seven PROMIS Fatigue items must be answered to compute a T-score."}
        </Text>
      ) : (
        <>
          <Text style={[styles.scoreHuge, typography.title]}>
            {tScore !== null ? Math.round(tScore * 10) / 10 : "n/a"}
          </Text>
          {severity ? (
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: SEVERITY_COLOR[severity].soft },
              ]}
            >
              <Text
                style={[typography.caption, styles.severityText, { color: SEVERITY_COLOR[severity].text }]}
              >
                {SEVERITY_LABEL[severity]}
              </Text>
            </View>
          ) : null}
          {se !== null ? (
            <Text style={[styles.seMeta, typography.micro]}>
              Standard error ±{Math.round(se * 10) / 10} (T-metric)
            </Text>
          ) : null}

          <View style={styles.scaleBlock}>
            <View style={styles.scaleLabels}>
              <Text style={[styles.axisLabel, typography.micro]}>{SCALE_MIN}</Text>
              <Text style={[styles.axisLabel, typography.micro]}>{SCALE_MAX}</Text>
            </View>
            <View
              style={styles.track}
              onLayout={(e) => {
                const w = PixelRatio.roundToNearestPixel(
                  e.nativeEvent.layout.width,
                );
                if (w > 0)
                  setTrackLayoutWidth((prev) => (prev !== w ? w : prev));
              }}
            >
              <View
                style={styles.trackGradientWrap}
                onLayout={(e) => {
                  const w = PixelRatio.roundToNearestPixel(
                    e.nativeEvent.layout.width,
                  );
                  if (w > 0) {
                    setTrackBarWidth((prev) => (prev !== w ? w : prev));
                  }
                }}
              >
                {trackBarWidth > 0 ? (
                  <Svg height={BAR_H} width={trackBarWidth}>
                    <Defs>
                      <SvgLinearGradient
                        gradientUnits="userSpaceOnUse"
                        id={gradientId}
                        x1={0}
                        x2={trackBarWidth}
                        y1={0}
                        y2={0}
                      >
                        <Stop offset="0" stopColor={GRAD_COLORS.low} />
                        <Stop offset="0.5" stopColor={GRAD_COLORS.mid} />
                        <Stop offset="1" stopColor={GRAD_COLORS.high} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect
                      fill={`url(#${gradientId})`}
                      height={BAR_H}
                      rx={BAR_R}
                      ry={BAR_R}
                      width={trackBarWidth}
                    />
                  </Svg>
                ) : (
                  <View style={styles.trackFillPlaceholder} />
                )}
              </View>
              {TICKS.map((tick) => {
                const pct = pctFromTScore(tick) / 100;
                const leftPx =
                  trackLayoutWidth > 0 ? pct * trackLayoutWidth : null;
                return (
                  <View
                    key={tick}
                    pointerEvents="none"
                    style={[
                      styles.tick,
                      leftPx !== null
                        ? {
                            left: leftPx,
                            transform: [
                              { translateX: -tickTranslateX },
                            ],
                          }
                        : {
                            left: `${pctFromTScore(tick)}%` as `${number}%`,
                            marginLeft: -tickTranslateX,
                          },
                    ]}
                  >
                    <View style={styles.tickLine} />
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      numberOfLines={1}
                      style={[
                        styles.tickLabel,
                        typography.micro,
                        {
                          fontSize: tickLabelFontSize,
                          maxWidth: tickLabelMaxWidth,
                        },
                      ]}
                    >
                      {tick}
                    </Text>
                  </View>
                );
              })}
              {tScore !== null ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.patientDot,
                    trackLayoutWidth > 0
                      ? {
                          left: (pctFromTScore(tScore) / 100) * trackLayoutWidth,
                          transform: [{ translateX: -8 }],
                        }
                      : {
                          left: `${pctFromTScore(tScore)}%` as `${number}%`,
                          marginLeft: -8,
                        },
                  ]}
                />
              ) : null}
            </View>
            <Text
              accessibilityRole="text"
              style={[styles.gradientLegend, typography.micro]}
            >
              Green on the left means lower fatigue; red on the right means higher fatigue.
            </Text>
          </View>

          <Text style={[styles.footerCaption, typography.caption]}>
            Higher score = more fatigue. PROMIS population mean is 50 (SD ≈ 10); this chart is orientation only, not a
            diagnosis.
          </Text>
        </>
      )}
      <FatigueEducationModal
        onClose={() => setEducationOpen(false)}
        snapshot={snapshot}
        visible={educationOpen}
      />
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
    borderColor: "rgba(15, 23, 42, 0.06)",
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
  chromePressed: {
    opacity: 0.94,
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
  emptyBody: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scoreHuge: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: CARD.fg,
    fontVariant: ["tabular-nums"],
    marginTop: spacing.xs,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.06)",
  },
  severityText: {
    fontWeight: "700",
  },
  seMeta: {
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.35,
    marginTop: spacing.xs,
  },
  scaleBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    color: CARD.muted,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  track: {
    minHeight: 72,
    paddingBottom: 4,
    position: "relative",
    justifyContent: "flex-start",
    borderRadius: radius.sm,
    overflow: "visible",
    marginHorizontal: spacing.xs,
  },
  trackGradientWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 18,
    height: BAR_H,
    borderRadius: BAR_R,
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  trackFillPlaceholder: {
    flex: 1,
    height: BAR_H,
    borderRadius: BAR_R,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  gradientLegend: {
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
    color: CARD.muted,
    fontWeight: "600",
    lineHeight: 16,
  },
  tick: {
    position: "absolute",
    top: 0,
    alignItems: "center",
    minWidth: 28,
  },
  tickLine: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    marginTop: 14,
  },
  tickLabel: {
    marginTop: 6,
    color: CARD.muted,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  patientDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 17,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 4,
  },
  footerCaption: {
    color: colors.textMuted,
    lineHeight: 18,
    fontWeight: "500",
    marginTop: spacing.sm + 6,
  },
  chartHint: {
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: "500",
  },
});

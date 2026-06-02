/**
 * PROMIS Fatigue 7a guide with submission history bar chart.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  FatigueDashboardPoint,
  FatigueDashboardSnapshot,
  FatigueSeverity,
} from "../../lib/fatigue-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { FatigueTScoreBarChart } from "./ui/FatigueTScoreBarChart";

const NAVY = "#0F172A";
const SURFACE = "#F9FAFB";
const STROKE = "rgba(15, 23, 42, 0.08)";
const SCALE_MIN = 30;
const SCALE_MAX = 80;
const SCALE_SPAN = SCALE_MAX - SCALE_MIN;

const SEVERITY_LABEL: Record<FatigueSeverity, string> = {
  none: "Low",
  mild: "Mild",
  moderate: "Moderate",
  severe: "High",
};

const SEVERITY_COLOR: Record<FatigueSeverity, string> = {
  none: "#22C55E",
  mild: "#F59E0B",
  moderate: "#EA580C",
  severe: "#DC2626",
};

const SCALE_BANDS = [
  { from: 30, to: 55, label: "Low", color: "#22C55E" },
  { from: 55, to: 60, label: "Mild", color: "#F59E0B" },
  { from: 60, to: 70, label: "Moderate", color: "#EA580C" },
  { from: 70, to: 80, label: "High", color: "#DC2626" },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  snapshot: FatigueDashboardSnapshot | null;
  history: FatigueDashboardPoint[];
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

function bandWidthPct(from: number, to: number): `${number}%` {
  return `${((to - from) / SCALE_SPAN) * 100}%`;
}

function FatigueScaleGuide({ tScore }: { tScore: number | null }) {
  return (
    <View style={styles.scaleCard}>
      <View style={styles.scaleAxis}>
        <Text style={[styles.axisLabel, typography.micro]}>{SCALE_MIN}</Text>
        <Text style={[styles.axisLabel, typography.micro]}>{SCALE_MAX}</Text>
      </View>
      <View style={styles.scaleTrack}>
        {SCALE_BANDS.map((band) => (
          <View
            key={band.label}
            style={[
              styles.scaleSegment,
              { width: bandWidthPct(band.from, band.to), backgroundColor: band.color },
            ]}
          />
        ))}
        {tScore !== null ? (
          <View
            pointerEvents="none"
            style={[
              styles.scoreMarker,
              { left: `${pctFromTScore(tScore)}%` as `${number}%` },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.legendRow}>
        {SCALE_BANDS.map((band) => (
          <View key={band.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: band.color }]} />
            <Text style={[styles.legendText, typography.micro]}>
              {band.from}
              {band.to < SCALE_MAX ? `-${band.to}` : "+"} {band.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FatigueEducationModal({
  visible,
  onClose,
  snapshot,
  history,
}: Props) {
  const insets = useSafeAreaInsets();
  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

  const submitted = snapshot ? formatSubmitted(snapshot.createdAtIso) : null;
  const complete =
    snapshot?.isComplete === true &&
    snapshot.tScore !== null &&
    snapshot.standardError !== null;
  const tScore = snapshot?.tScore ?? null;
  const severity = snapshot?.severity ?? null;

  const body = (
    <View
      style={[
        styles.contentRoot,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          paddingTop:
            Platform.OS === "ios" ? insets.top + 8 : spacing.md + 10,
        },
      ]}
    >
      <View style={styles.sheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTitles}>
            <Text style={[typography.title, styles.modalTitle]}>
              PROMIS Fatigue 7a
            </Text>
            <Text style={[typography.caption, styles.modalSub]}>
              T-score history and reference scale
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.72 },
            ]}
          >
            <Ionicons color={colors.textMuted} name="close" size={26} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.securityStrip}>
            <Ionicons color={colors.primary} name="shield-checkmark" size={18} />
            <Text style={[typography.caption, styles.securityText]}>
              Protected health information. Visible only while you are signed in on
              this device.
            </Text>
          </View>

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Submission history
          </Text>
          <FatigueTScoreBarChart
            highlightIso={snapshot?.createdAtIso ?? null}
            points={history}
          />

          {snapshot && complete ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>
                Latest result
              </Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>
                  {submitted}
                </Text>
              ) : null}
              <View style={styles.snapshotMain}>
                <Text style={[styles.snapshotScore, typography.title]}>
                  T {Math.round(tScore! * 10) / 10}
                </Text>
                {severity ? (
                  <View
                    style={[
                      styles.severityPill,
                      { backgroundColor: `${SEVERITY_COLOR[severity]}22` },
                    ]}
                  >
                    <View
                      style={[
                        styles.severityDot,
                        { backgroundColor: SEVERITY_COLOR[severity] },
                      ]}
                    />
                    <Text
                      style={[
                        typography.caption,
                        styles.severityPillText,
                        { color: SEVERITY_COLOR[severity] },
                      ]}
                    >
                      {SEVERITY_LABEL[severity]}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Reference scale
          </Text>
          <FatigueScaleGuide tScore={complete ? tScore : null} />

          <View style={styles.briefList}>
            <BriefRow
              icon="arrow-up-outline"
              text="Higher T-score means more self-reported fatigue."
            />
            <BriefRow
              icon="analytics-outline"
              text="50 is near the PROMIS reference average."
            />
            <BriefRow
              icon="medkit-outline"
              text="Use trends to guide conversations with your care team."
            />
          </View>

          <View style={styles.disclaimerCard}>
            <Ionicons color={colors.textMuted} name="lock-closed-outline" size={16} />
            <Text style={[typography.caption, styles.disclaimerText]}>
              Scoring follows the HealthMeasures PROMIS Fatigue 7a manual.
            </Text>
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={presentationStyle}
      transparent={Platform.OS !== "ios"}
      visible={visible}
    >
      {Platform.OS !== "ios" ? (
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdropTap}
          />
          <View style={styles.androidSheet}>{body}</View>
        </View>
      ) : (
        <View style={styles.iosWrap}>{body}</View>
      )}
    </Modal>
  );
}

function BriefRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.briefRow}>
      <Ionicons color={colors.primary} name={icon} size={16} />
      <Text style={[typography.caption, styles.briefText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  backdropTap: {
    flex: 1,
  },
  androidSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    maxHeight: "92%",
    backgroundColor: colors.surface,
  },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg + 4,
    flexShrink: 1,
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modalHeaderTitles: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  modalTitle: {
    color: NAVY,
    letterSpacing: -0.35,
  },
  modalSub: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
  },
  scroll: {
    maxHeight: 620,
    alignSelf: "stretch",
  },
  securityStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  securityText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "600",
  },
  sectionEyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 1.05,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  snapshotCard: {
    backgroundColor: SURFACE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
    padding: spacing.md + 2,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  snapshotEyebrow: {
    color: colors.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  snapshotTime: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  snapshotMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  snapshotScore: {
    color: NAVY,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityPillText: {
    fontWeight: "700",
  },
  scaleCard: {
    backgroundColor: SURFACE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
    padding: spacing.md,
    gap: spacing.sm,
  },
  scaleAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  scaleTrack: {
    height: 14,
    borderRadius: 7,
    overflow: "visible",
    flexDirection: "row",
    position: "relative",
  },
  scaleSegment: {
    height: 14,
  },
  scoreMarker: {
    position: "absolute",
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  briefList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  briefRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  briefText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
  },
  disclaimerText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
});

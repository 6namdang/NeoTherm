import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
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
import {
  COGNITIVE_TOTAL_MAX,
  type CognitiveBurdenSeverity,
  type CognitiveDashboardPoint,
  type CognitiveDashboardSnapshot,
} from "../../lib/cognitive-function-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { AnimatedClinicalLineChart } from "./ui/AnimatedClinicalLineChart";

const NAVY = "#0F172A";
const SURFACE = "#F9FAFB";
const STROKE = "rgba(15, 23, 42, 0.08)";

const SEVERITY_LABEL: Record<CognitiveBurdenSeverity, string> = {
  low: "Low",
  mild: "Mild",
  moderate: "Moderate",
  high: "High",
};

const SEVERITY_COLOR: Record<CognitiveBurdenSeverity, string> = {
  low: "#0A84FF",
  mild: "#32D74B",
  moderate: colors.systemOrange,
  high: "#BF5AF2",
};

const SCALE_BANDS = [
  { from: 0, to: 4, label: "Low", color: "#0A84FF" },
  { from: 5, to: 8, label: "Mild", color: "#32D74B" },
  { from: 9, to: 12, label: "Moderate", color: colors.systemOrange },
  { from: 13, to: 16, label: "High", color: "#BF5AF2" },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  snapshot: CognitiveDashboardSnapshot | null;
  history: CognitiveDashboardPoint[];
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

function formatTickDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

function bandWidthPct(from: number, to: number): `${number}%` {
  return `${((to - from + 1) / (COGNITIVE_TOTAL_MAX + 1)) * 100}%`;
}

function scoreMarkerPct(total: number): `${number}%` {
  const clamped = Math.min(COGNITIVE_TOTAL_MAX, Math.max(0, total));
  return `${(clamped / COGNITIVE_TOTAL_MAX) * 100}%`;
}

export function CognitiveFunctionEducationModal({
  visible,
  onClose,
  snapshot,
  history,
}: Props) {
  const insets = useSafeAreaInsets();
  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

  const chronological = useMemo(
    () =>
      [...history].sort(
        (a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso),
      ),
    [history],
  );
  const chartValues = chronological.map((point) => point.total ?? 0);
  const chartLabels = chronological.map((point) =>
    formatTickDate(point.createdAtIso),
  );
  const chartKey = `${history.length}-${history[0]?.createdAtIso ?? "empty"}`;

  const submitted = snapshot ? formatSubmitted(snapshot.createdAtIso) : null;
  const complete =
    snapshot?.isComplete === true && snapshot.total !== null && snapshot.severity !== null;
  const total = snapshot?.total ?? null;
  const severity = snapshot?.severity ?? null;
  const accent = severity ? SEVERITY_COLOR[severity] : SEVERITY_COLOR.low;

  const body = (
    <View
      style={[
        styles.contentRoot,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          paddingTop: Platform.OS === "ios" ? insets.top + 8 : spacing.md + 10,
        },
      ]}
    >
      <View style={styles.sheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTitles}>
            <Text style={[typography.title, styles.modalTitle]}>Cognitive function</Text>
            <Text style={[typography.caption, styles.modalSub]}>
              Weekly symptom burden totals, history, and reference bands
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.72 }]}
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

          <Text style={[typography.micro, styles.sectionEyebrow]}>Submission history</Text>
          {chartValues.length === 0 ? (
            <Text style={[typography.body, styles.emptyHistory]}>
              Complete more cognitive check-ins to build this trend chart.
            </Text>
          ) : (
            <AnimatedClinicalLineChart
              animateKey={chartKey}
              gradientId="cognitiveModalHistoryStroke"
              interactive
              labels={chartLabels}
              lineColor={accent}
              maxValue={COGNITIVE_TOTAL_MAX}
              values={chartValues}
            />
          )}

          {snapshot && complete ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>Latest result</Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>{submitted}</Text>
              ) : null}
              <View style={styles.snapshotMain}>
                <Text style={[styles.snapshotScore, typography.title]}>
                  {total}
                  <Text style={styles.snapshotScoreSuffix}> / {COGNITIVE_TOTAL_MAX}</Text>
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

          <Text style={[typography.micro, styles.sectionEyebrow]}>Reference bands</Text>
          <View style={styles.scaleCard}>
            <View style={styles.scaleAxis}>
              <Text style={[styles.axisLabel, typography.micro]}>0</Text>
              <Text style={[styles.axisLabel, typography.micro]}>{COGNITIVE_TOTAL_MAX}</Text>
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
              {total !== null ? (
                <View
                  pointerEvents="none"
                  style={[styles.scoreMarker, { left: scoreMarkerPct(total) }]}
                />
              ) : null}
            </View>
            <View style={styles.legendRow}>
              {SCALE_BANDS.map((band) => (
                <View key={band.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: band.color }]} />
                  <Text style={[styles.legendText, typography.micro]}>
                    {band.from}
                    {band.to < COGNITIVE_TOTAL_MAX ? `–${band.to}` : "+"} {band.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.briefList}>
            <BriefRow
              icon="arrow-up-outline"
              text="Higher totals mean concentration or clarity issues occurred more often — not IQ."
            />
            <BriefRow
              icon="analytics-outline"
              text="Four PROM-style frequency items are summed (0–4 each) for a 0–16 burden score."
            />
            <BriefRow
              icon="medkit-outline"
              text="Interpret alongside sleep, fatigue, and medication changes with your care team."
            />
          </View>

          <View style={styles.disclaimerCard}>
            <Ionicons color={colors.textMuted} name="lock-closed-outline" size={16} />
            <Text style={[typography.caption, styles.disclaimerText]}>
              This screen tracks self-reported cognitive symptoms over time, not neuropsych testing.
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
  emptyHistory: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
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
  snapshotScoreSuffix: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textMuted,
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

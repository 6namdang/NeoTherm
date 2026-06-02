/**
 * Modal: average pain (PAINQU8 · 0 to 4) history. Apple Health inspired typography and red accent.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
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
import type { PainIntensityDashboardPoint } from "../../lib/pain-intensity-scoring";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { AnimatedClinicalLineChart } from "./ui/AnimatedClinicalLineChart";

const HEALTH_RED = colors.systemRed;
const HEALTH_LABEL = "#000000";

const fontSans = Platform.select({
  ios: "System",
  android: undefined,
});

type Props = {
  visible: boolean;
  onClose: () => void;
  history: PainIntensityDashboardPoint[];
};

function formatTickDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
}

function formatAssessmentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function sortNewestFirst<T extends { createdAtIso: string }>(points: T[]): T[] {
  return [...points].sort(
    (a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso),
  );
}

function sortOldestFirst<T extends { createdAtIso: string }>(points: T[]): T[] {
  return [...points].sort(
    (a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso),
  );
}

function averageSeries(points: PainIntensityDashboardPoint[]): PainIntensityDashboardPoint[] {
  return points.filter((point) => point.average0to4 !== null);
}

function HistoryPager({
  centerLabel,
  index,
  onNewer,
  onOlder,
  total,
}: {
  centerLabel?: string;
  index: number;
  onNewer: () => void;
  onOlder: () => void;
  total: number;
}) {
  if (total <= 1) return null;

  return (
    <View style={styles.pager}>
      <Pressable
        accessibilityLabel="Older check-in"
        accessibilityRole="button"
        disabled={index >= total - 1}
        onPress={onOlder}
        style={({ pressed }) => [
          styles.pagerButton,
          index >= total - 1 && styles.pagerButtonDisabled,
          pressed && index < total - 1 && { opacity: 0.72 },
        ]}
      >
        <Text style={styles.pagerButtonText}>Older</Text>
      </Pressable>
      {centerLabel ? (
        <Text numberOfLines={1} style={styles.pagerLabel}>
          {centerLabel}
        </Text>
      ) : null}
      <Pressable
        accessibilityLabel="Newer check-in"
        accessibilityRole="button"
        disabled={index <= 0}
        onPress={onNewer}
        style={({ pressed }) => [
          styles.pagerButton,
          index <= 0 && styles.pagerButtonDisabled,
          pressed && index > 0 && { opacity: 0.72 },
        ]}
      >
        <Text style={styles.pagerButtonText}>Newer</Text>
      </Pressable>
    </View>
  );
}

export function PainIntensityHistoryModal({ visible, onClose, history }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const withAverage = useMemo(() => averageSeries(history), [history]);
  const newestFirst = useMemo(() => sortNewestFirst(withAverage), [withAverage]);
  const chronological = useMemo(() => sortOldestFirst(withAverage), [withAverage]);
  const selected = newestFirst[selectedIndex] ?? null;

  const chartValues = chronological
    .map((point) => point.average0to4)
    .filter((value): value is number => value !== null);
  const chartLabels = chronological.map((point) => formatTickDate(point.createdAtIso));
  const animateKey = `${history.length}-${selected?.createdAtIso ?? "empty"}-${selectedIndex}`;

  useEffect(() => {
    if (visible) setSelectedIndex(0);
  }, [visible]);

  useEffect(() => {
    setSelectedIndex((current) =>
      Math.min(current, Math.max(newestFirst.length - 1, 0)),
    );
  }, [newestFirst.length]);

  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

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
            <Text style={styles.modalTitle}>Average pain</Text>
            <Text style={styles.modalSub}>History · past check-ins</Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.55 }]}
          >
            <Ionicons color={colors.systemGray} name="close" size={26} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <Text style={styles.detailCaption}>
            “How intense was your average pain?” 0 lowest through 4 highest. Use Older
            and Newer to review each submission.
          </Text>

          {chronological.length === 0 ? (
            <Text style={styles.emptyChart}>
              No check-ins with average pain answered yet; submit that item to build
              this chart.
            </Text>
          ) : (
            <>
              {selected && selected.average0to4 !== null ? (
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotDate}>
                    {formatAssessmentDate(selected.createdAtIso)}
                  </Text>
                  <Text style={styles.snapshotValue}>
                    {selected.average0to4}
                  </Text>
                  <Text style={styles.snapshotMeta}>Average pain (0 to 4)</Text>
                  <View style={styles.metricRow}>
                    <Metric
                      label="Worst"
                      value={
                        selected.worst0to4 !== null ? String(selected.worst0to4) : "n/a"
                      }
                    />
                    <Metric
                      label="Current"
                      value={
                        selected.current0to4 !== null
                          ? String(selected.current0to4)
                          : "n/a"
                      }
                    />
                  </View>
                </View>
              ) : null}

              <HistoryPager
                centerLabel={
                  selected ? formatAssessmentDate(selected.createdAtIso) : undefined
                }
                index={selectedIndex}
                onNewer={() => setSelectedIndex((cur) => Math.max(cur - 1, 0))}
                onOlder={() =>
                  setSelectedIndex((cur) =>
                    Math.min(cur + 1, Math.max(newestFirst.length - 1, 0)),
                  )
                }
                total={newestFirst.length}
              />

              <AnimatedClinicalLineChart
                animateKey={animateKey}
                gradientId="painAvgHistoryStroke"
                interactive
                labels={chartLabels}
                lineColor={HEALTH_RED}
                maxValue={4}
                values={chartValues}
              />

              <View style={styles.legendCapsule}>
                <View style={styles.legendStripe} />
                <Text style={styles.legendText}>Average pain (0 to 4)</Text>
              </View>
            </>
          )}

          <Text style={styles.footnote}>
            {chronological.length} snapshot{chronological.length === 1 ? "" : "s"} with
            average pain.
          </Text>
          <View style={{ height: spacing.xl }} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  backdropTap: {
    flex: 1,
  },
  androidSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    maxHeight: "92%",
    backgroundColor: colors.surface,
  },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
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
    gap: 4,
  },
  modalTitle: {
    fontFamily: fontSans,
    fontSize: 17,
    fontWeight: "600",
    color: HEALTH_LABEL,
    letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
  },
  modalSub: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "400",
    color: colors.systemGray,
  },
  detailCaption: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "400",
    color: colors.systemGray,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.systemGray6,
  },
  scroll: {
    maxHeight: 560,
    alignSelf: "stretch",
  },
  emptyChart: {
    fontFamily: fontSans,
    fontSize: 15,
    fontWeight: "400",
    color: colors.systemGray,
    lineHeight: 22,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  snapshotCard: {
    borderRadius: 18,
    backgroundColor: colors.systemGray6,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  snapshotDate: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: "600",
    color: colors.systemGray,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  snapshotValue: {
    fontFamily: fontSans,
    fontSize: 42,
    fontWeight: "700",
    color: HEALTH_LABEL,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  snapshotMeta: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "500",
    color: colors.systemGray,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
  metric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.systemGray,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: fontSans,
    fontSize: 20,
    fontWeight: "700",
    color: HEALTH_LABEL,
    fontVariant: ["tabular-nums"],
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pagerButton: {
    borderRadius: 10,
    backgroundColor: colors.systemGray6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pagerButtonDisabled: {
    opacity: 0.4,
  },
  pagerButtonText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "600",
    color: HEALTH_LABEL,
  },
  pagerLabel: {
    flex: 1,
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: "500",
    color: colors.systemGray,
    textAlign: "center",
  },
  legendCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.systemGray6,
    alignSelf: "flex-start",
  },
  legendStripe: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: HEALTH_RED,
  },
  legendText: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: "500",
    color: HEALTH_LABEL,
    flexShrink: 1,
  },
  footnote: {
    fontFamily: fontSans,
    fontSize: 12,
    fontWeight: "400",
    color: colors.systemGray,
    marginTop: spacing.md,
    lineHeight: 17,
    textAlign: "center",
  },
});

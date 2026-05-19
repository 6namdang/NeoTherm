/**
 * Modal: average pain (PAINQU8 · 0 to 4) history. Apple Health inspired typography and red accent.
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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Polyline,
  Stop,
} from "react-native-svg";
import type { PainIntensityDashboardPoint } from "../../lib/pain-intensity-scoring";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

const GRADIENT_ID = "painAvgHistoryStroke";

const CHART_W = 320;
const CHART_H = 200;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 8;

const fontSans = Platform.select({
  ios: "System",
  android: undefined,
});

const HEALTH_RED = colors.systemRed;
const HEALTH_LABEL = "#000000";

type Props = {
  visible: boolean;
  onClose: () => void;
  history: PainIntensityDashboardPoint[];
};

function formatTickDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

function averageSeriesOldestFirst(
  history: PainIntensityDashboardPoint[],
): PainIntensityDashboardPoint[] {
  const sorted = [...history].sort(
    (a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso),
  );
  return sorted.filter((p) => p.average0to4 !== null);
}

function averagePolylinePoints(series: PainIntensityDashboardPoint[]): string {
  const n = series.length;
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  function xAt(i: number): number {
    if (n <= 1) return PAD_L + innerW / 2;
    return PAD_L + (i / (n - 1)) * innerW;
  }

  function yAt(level: number): number {
    return PAD_T + innerH * (1 - level / 4);
  }

  const pts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = series[i];
    const lvl = p.average0to4 ?? 0;
    pts.push(`${xAt(i)},${yAt(lvl)}`);
  }
  return pts.join(" ");
}

function tickIndicesForCount(count: number): number[] {
  if (count === 0) return [];
  if (count <= 5) {
    return [...Array(count).keys()];
  }
  const maxTicks = 5;
  const out: number[] = [0];
  for (let k = 1; k <= maxTicks - 2; k += 1) {
    out.push(Math.round((k / (maxTicks - 1)) * (count - 1)));
  }
  out.push(count - 1);
  return [...new Set(out)].sort((a, b) => a - b);
}

export function PainIntensityHistoryModal({ visible, onClose, history }: Props) {
  const insets = useSafeAreaInsets();
  const chronological = averageSeriesOldestFirst(history);
  const avgPointsStr = averagePolylinePoints(chronological);

  const innerH = CHART_H - PAD_T - PAD_B;
  const yLvl = [0, 1, 2, 3, 4].map((lvl) => PAD_T + innerH * (1 - lvl / 4));

  const dotNodes = chronological.map((p, i) => {
    const n = chronological.length;
    const innerW = CHART_W - PAD_L - PAD_R;
    const xi =
      n <= 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW;

    function yAt(level: number): number {
      return PAD_T + innerH * (1 - level / 4);
    }

    const lvl = p.average0to4 ?? 0;
    return (
      <Circle
        cx={xi}
        cy={yAt(lvl)}
        fill="#FFFFFF"
        key={`${p.createdAtIso}-avg`}
        r={5}
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={2}
      />
    );
  });

  const tickIdx = tickIndicesForCount(chronological.length);

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
            <Text style={styles.modalSub}>History. Past check-ins</Text>
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
            “How intense was your average pain?” 0 lowest through 4 highest. Timeline: left is older, right is newer.
          </Text>

          {chronological.length === 0 ? (
            <Text style={styles.emptyChart}>
              No check-ins with average pain answered yet; submit that item to build this chart.
            </Text>
          ) : (
            <>
              <View style={styles.chartYRow}>
                <View style={styles.yLabels}>
                  {[4, 3, 2, 1, 0].map((lvl) => (
                    <Text key={lvl} style={styles.yLab}>
                      {lvl}
                    </Text>
                  ))}
                </View>
                <View style={styles.svgBox}>
                  <Svg height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%">
                    <Defs>
                      <LinearGradient
                        gradientUnits="userSpaceOnUse"
                        id={GRADIENT_ID}
                        x1={PAD_L}
                        x2={CHART_W - PAD_R}
                        y1={0}
                        y2={0}
                      >
                        <Stop offset="0%" stopColor={colors.systemGray3} />
                        <Stop offset="45%" stopColor={HEALTH_RED} />
                        <Stop offset="100%" stopColor={HEALTH_RED} />
                      </LinearGradient>
                    </Defs>
                    {[0, 1, 2, 3, 4].map((lvl) => (
                      <Line
                        key={`g-${lvl}`}
                        stroke={colors.systemGray6}
                        strokeWidth={
                          lvl === 0 || lvl === 4 ? 1 : StyleSheet.hairlineWidth ?? 1
                        }
                        x1={PAD_L}
                        x2={CHART_W - PAD_R}
                        y1={yLvl[lvl]}
                        y2={yLvl[lvl]}
                      />
                    ))}
                    {chronological.length >= 2 ? (
                      <Polyline
                        fill="none"
                        points={avgPointsStr}
                        stroke={`url(#${GRADIENT_ID})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    ) : null}
                    {dotNodes}
                  </Svg>
                </View>
              </View>

              <View style={styles.xTicksRow}>
                {tickIdx.map((idx) => {
                  const p = chronological[idx];
                  if (!p) return null;
                  return (
                    <Text key={`${p.createdAtIso}-${idx}`} style={styles.xTick}>
                      {formatTickDate(p.createdAtIso)}
                    </Text>
                  );
                })}
              </View>

              <View style={styles.legendCapsule}>
                <View style={styles.legendStripe} />
                <Text style={styles.legendText}>
                  Average pain (0 to 4)
                </Text>
              </View>
            </>
          )}

          <Text style={styles.footnote}>
            {chronological.length} snapshot{chronological.length === 1 ? "" : "s"} with average pain. Orientation
            only.
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
  chartYRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.xs,
  },
  yLabels: {
    width: 22,
    justifyContent: "space-between",
    paddingVertical: PAD_T + 4,
    paddingBottom: PAD_B + 4,
  },
  yLab: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: "600",
    color: colors.systemGray,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  svgBox: {
    flex: 1,
    minWidth: 0,
  },
  xTicksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: 30,
  },
  xTick: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: "500",
    color: colors.systemGray,
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

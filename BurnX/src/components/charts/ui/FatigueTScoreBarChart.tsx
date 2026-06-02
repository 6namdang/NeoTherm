import { Fragment, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import type { FatigueDashboardPoint, FatigueSeverity } from "../../../lib/fatigue-scoring";
import { colors } from "../../../theme/colors";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

const NAVY = "#0F172A";
const SCALE_MIN = 30;
const SCALE_MAX = 80;
const SCALE_SPAN = SCALE_MAX - SCALE_MIN;
const CHART_H = 196;
const PAD_TOP = 22;
const PAD_BOTTOM = 36;
const PAD_LEFT = 36;
const BAR_W = 28;
const BAR_GAP = 14;
const PLOT_H = CHART_H - PAD_TOP - PAD_BOTTOM;

const GRID_TICKS = [30, 50, 70, 80] as const;

const SEVERITY_FILL: Record<FatigueSeverity, string> = {
  none: "#22C55E",
  mild: "#F59E0B",
  moderate: "#EA580C",
  severe: "#DC2626",
};

type Props = {
  points: FatigueDashboardPoint[];
  highlightIso?: string | null;
};

function completePoints(points: FatigueDashboardPoint[]): FatigueDashboardPoint[] {
  return points.filter(
    (p) => p.isComplete === true && p.tScore !== null && p.severity !== null,
  );
}

function sortOldestFirst(points: FatigueDashboardPoint[]): FatigueDashboardPoint[] {
  return [...points].sort(
    (a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso),
  );
}

function formatBarLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

function barHeightPx(tScore: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, tScore));
  return ((clamped - SCALE_MIN) / SCALE_SPAN) * PLOT_H;
}

function yForScore(score: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, score));
  return PAD_TOP + PLOT_H * (1 - (clamped - SCALE_MIN) / SCALE_SPAN);
}

export function FatigueTScoreBarChart({ points, highlightIso }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const series = useMemo(
    () => sortOldestFirst(completePoints(points)),
    [points],
  );

  const svgWidth = Math.max(
    series.length * (BAR_W + BAR_GAP) + PAD_LEFT + spacing.lg,
    Math.min(windowWidth - spacing.lg * 2, 320),
  );

  if (series.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[typography.caption, styles.emptyText]}>
          Complete the Fatigue questionnaire to build your T-score history.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.yLegend}>
        <Text style={[typography.micro, styles.yLegendText]}>T-score</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Svg height={CHART_H} width={svgWidth}>
          {GRID_TICKS.map((tick) => {
            const y = yForScore(tick);
            return (
              <Line
                key={tick}
                stroke="rgba(15, 23, 42, 0.08)"
                strokeDasharray={tick === 50 ? "4 4" : undefined}
                strokeWidth={tick === 50 ? 1.2 : 1}
                x1={PAD_LEFT}
                x2={svgWidth - spacing.sm}
                y1={y}
                y2={y}
              />
            );
          })}

          {GRID_TICKS.map((tick) => {
            const y = yForScore(tick);
            return (
              <SvgText
                key={`label-${tick}`}
                fill={colors.textMuted}
                fontSize={10}
                fontWeight="600"
                textAnchor="end"
                x={PAD_LEFT - 6}
                y={y + 3}
              >
                {tick}
              </SvgText>
            );
          })}

          {series.map((point, index) => {
            const t = point.tScore!;
            const h = barHeightPx(t);
            const x = PAD_LEFT + index * (BAR_W + BAR_GAP);
            const y = PAD_TOP + PLOT_H - h;
            const fill = SEVERITY_FILL[point.severity!];
            const highlighted =
              highlightIso !== null &&
              highlightIso !== undefined &&
              point.createdAtIso === highlightIso;
            const label = formatBarLabel(point.createdAtIso);
            const valueLabel = String(Math.round(t * 10) / 10);

            return (
              <Fragment key={point.createdAtIso}>
                <Rect
                  fill={fill}
                  height={h}
                  opacity={highlighted ? 1 : 0.88}
                  rx={6}
                  ry={6}
                  stroke={highlighted ? NAVY : "transparent"}
                  strokeWidth={highlighted ? 2 : 0}
                  width={BAR_W}
                  x={x}
                  y={y}
                />
                <SvgText
                  fill={NAVY}
                  fontSize={10}
                  fontWeight="700"
                  textAnchor="middle"
                  x={x + BAR_W / 2}
                  y={Math.max(PAD_TOP + 10, y - 4)}
                >
                  {valueLabel}
                </SvgText>
                <SvgText
                  fill={colors.textMuted}
                  fontSize={10}
                  fontWeight="600"
                  textAnchor="middle"
                  x={x + BAR_W / 2}
                  y={CHART_H - 10}
                >
                  {label}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#F9FAFB",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    overflow: "hidden",
  },
  yLegend: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  yLegendText: {
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#F9FAFB",
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
});

import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

import type { HomeAwayDailySummary } from "../../../lib/home-location-types";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { ChartLegendItem } from "./ChartLegendItem";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const CHART_W = 320;
const CHART_H = 200;
const PAD = { top: 12, bottom: 8, left: 12, right: 12 };

type DayDatum = {
  index: number;
  label: string;
  home: number;
  away: number;
};

type AnimatedWeekBarsProps = {
  days: HomeAwayDailySummary[];
  selectedIndex?: number;
};

function shortLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey.slice(5);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function BarColumn({
  x,
  barWidth,
  chartBottom,
  homeHeight,
  awayHeight,
  delayMs,
}: {
  x: number;
  barWidth: number;
  chartBottom: number;
  homeHeight: number;
  awayHeight: number;
  delayMs: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [delayMs, homeHeight, awayHeight, progress]);

  const homeProps = useAnimatedProps(() => ({
    height: homeHeight * progress.value,
    y: chartBottom - homeHeight * progress.value,
  }));

  const awayProps = useAnimatedProps(() => ({
    height: awayHeight * progress.value,
    y: chartBottom - (homeHeight + awayHeight) * progress.value,
  }));

  return (
    <>
      <AnimatedRect
        animatedProps={homeProps}
        fill={colors.primary}
        rx={6}
        ry={6}
        width={barWidth}
        x={x}
      />
      <AnimatedRect
        animatedProps={awayProps}
        fill={colors.systemOrange}
        rx={6}
        ry={6}
        width={barWidth}
        x={x}
      />
    </>
  );
}

export function AnimatedWeekBars({
  days,
  selectedIndex = 0,
}: AnimatedWeekBarsProps) {
  const data = useMemo<DayDatum[]>(
    () =>
      days.map((day, index) => ({
        index,
        label: shortLabel(day.date),
        home: Math.max(0, day.homeMinutes) / 60,
        away: Math.max(0, day.outsideMinutes) / 60,
      })),
    [days],
  );

  const totals = data.reduce(
    (acc, day) => ({
      home: acc.home + day.home,
      away: acc.away + day.away,
    }),
    { home: 0, away: 0 },
  );

  if (data.length === 0) {
    return (
      <Text style={[styles.empty, typography.body]}>
        No home/away estimates yet. Tracking starts after setup.
      </Text>
    );
  }

  const maxHours = Math.max(1, ...data.map((day) => day.home + day.away));
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const chartBottom = PAD.top + innerH;
  const gap = 10;
  const barWidth = Math.max(12, (innerW - gap * (data.length - 1)) / data.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <ChartLegendItem
          color={colors.primary}
          label="Home"
          value={`${Math.round(totals.home * 10) / 10}h total`}
        />
        <ChartLegendItem
          color={colors.systemOrange}
          label="Away"
          value={`${Math.round(totals.away * 10) / 10}h total`}
        />
      </View>

      <View style={styles.chartCard}>
        <Svg height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%">
          {[0, 1, 2, 3].map((line) => {
            const y = PAD.top + (innerH / 3) * line;
            return (
              <Rect
                fill={colors.systemGray6}
                height={1}
                key={line}
                width={innerW}
                x={PAD.left}
                y={y}
              />
            );
          })}

          {data.map((day, index) => {
            const x = PAD.left + index * (barWidth + gap);
            const homeHeight = (day.home / maxHours) * innerH;
            const awayHeight = (day.away / maxHours) * innerH;
            return (
              <BarColumn
                awayHeight={awayHeight}
                barWidth={barWidth}
                chartBottom={chartBottom}
                delayMs={index * 70}
                homeHeight={homeHeight}
                key={day.label}
                x={x}
              />
            );
          })}
        </Svg>
      </View>

      <View style={styles.axis}>
        {data.map((day) => (
          <Text
            key={`${day.index}-${day.label}`}
            style={[
              styles.axisLabel,
              typography.caption,
              day.index === selectedIndex && styles.axisLabelSelected,
            ]}
          >
            {day.label}
          </Text>
        ))}
      </View>

      <Text style={[styles.caption, typography.caption]}>
        Each bar is one day. Blue is home time and orange is away time.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: colors.systemGray6,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  axisLabel: {
    color: colors.textMuted,
    flex: 1,
    textAlign: "center",
  },
  axisLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  caption: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  empty: {
    color: colors.textSecondary,
  },
});

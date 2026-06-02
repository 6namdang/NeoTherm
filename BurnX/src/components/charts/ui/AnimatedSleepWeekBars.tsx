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

import { formatDuration } from "../../../lib/home-location-accumulator";
import type { SleepDailySummary } from "../../../lib/sleep-storage";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { ChartLegendItem } from "./ChartLegendItem";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const CHART_W = 320;
const CHART_H = 180;
const PAD = { top: 12, bottom: 8, left: 12, right: 12 };

export const SLEEP_CHART_DAYS = 7;

type DayDatum = {
  index: number;
  label: string;
  hours: number;
  minutes: number;
};

type AnimatedSleepWeekBarsProps = {
  days: SleepDailySummary[];
};

function shortLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey.slice(5);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function SleepBarColumn({
  x,
  barWidth,
  chartBottom,
  barHeight,
  delayMs,
}: {
  x: number;
  barWidth: number;
  chartBottom: number;
  barHeight: number;
  delayMs: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, [barHeight, delayMs, progress]);

  const barProps = useAnimatedProps(() => ({
    height: barHeight * progress.value,
    y: chartBottom - barHeight * progress.value,
  }));

  return (
    <AnimatedRect
      animatedProps={barProps}
      fill={colors.primary}
      rx={6}
      ry={6}
      width={barWidth}
      x={x}
    />
  );
}

export function AnimatedSleepWeekBars({ days }: AnimatedSleepWeekBarsProps) {
  const data = useMemo<DayDatum[]>(
    () =>
      days.map((day, index) => ({
        index,
        label: shortLabel(day.date),
        hours: Math.max(0, day.sleepMinutes) / 60,
        minutes: Math.max(0, day.sleepMinutes),
      })),
    [days],
  );

  const totalMinutes = data.reduce((sum, day) => sum + day.minutes, 0);

  if (data.length === 0) {
    return (
      <Text style={[styles.empty, typography.body]}>
        No sleep estimates yet. Tracking starts after home setup.
      </Text>
    );
  }

  const maxHours = Math.max(1, ...data.map((day) => day.hours));
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
          label="Estimated sleep"
          value={`${formatDuration(totalMinutes)} total`}
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
            const barHeight = (day.hours / maxHours) * innerH;
            return (
              <SleepBarColumn
                barHeight={barHeight}
                barWidth={barWidth}
                chartBottom={chartBottom}
                delayMs={index * 70}
                key={day.label}
                x={x}
              />
            );
          })}
        </Svg>
      </View>

      <View style={styles.axis}>
        {data.map((day) => (
          <Text key={`${day.index}-${day.label}`} style={[styles.axisLabel, typography.caption]}>
            {day.label}
          </Text>
        ))}
      </View>

      <Text style={[styles.caption, typography.caption]}>
        Last 7 days. Each bar is estimated sleep for that night.
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
  caption: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  empty: {
    color: colors.textSecondary,
  },
});

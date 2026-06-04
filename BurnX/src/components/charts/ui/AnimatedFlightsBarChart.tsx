import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line, Rect } from "react-native-svg";

import type { AppleHealthFlightsHistoryPoint } from "../../../lib/healthkit";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const CHART_W = 320;
const CHART_H = 210;
const PAD = { top: 14, bottom: 8, left: 14, right: 14 };

type AnimatedFlightsBarChartProps = {
  history: AppleHealthFlightsHistoryPoint[];
};

type SelectedBar = {
  index: number;
  value: number;
  label: string;
} | null;

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function average(history: AppleHealthFlightsHistoryPoint[]): number {
  if (history.length === 0) return 0;
  return Math.round(
    history.reduce((sum, point) => sum + point.flights, 0) / history.length,
  );
}

function FlightsBarColumn({
  x,
  barWidth,
  chartBottom,
  barHeight,
  delayMs,
  isSelected,
}: {
  x: number;
  barWidth: number;
  chartBottom: number;
  barHeight: number;
  delayMs: number;
  isSelected: boolean;
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
      fill={isSelected ? "#FF9500" : colors.systemOrange}
      opacity={isSelected ? 1 : 0.85}
      rx={6}
      ry={6}
      width={barWidth}
      x={x}
    />
  );
}

export function AnimatedFlightsBarChart({ history }: AnimatedFlightsBarChartProps) {
  const [selected, setSelected] = useState<SelectedBar>(null);
  const avg = average(history);
  const values = useMemo(() => history.map((point) => point.flights), [history]);
  const maxValue = Math.max(avg, ...values, 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const chartBottom = PAD.top + innerH;
  const avgY = PAD.top + innerH * (1 - avg / maxValue);
  const gap = 10;
  const barWidth = Math.max(
    12,
    history.length > 0 ? (innerW - gap * (history.length - 1)) / history.length : 12,
  );

  const handleBarPress = (index: number) => {
    const point = history[index];
    if (!point) return;
    if (selected?.index === index) {
      setSelected(null);
    } else {
      setSelected({ index, value: point.flights, label: point.label });
    }
  };

  if (history.length === 0) {
    return (
      <Text style={[styles.empty, typography.body]}>
        No flights climbed samples available for the last 7 days.
      </Text>
    );
  }

  const hitAreaWidth = history.length > 0 ? innerW / history.length : innerW;

  return (
    <View style={styles.wrap}>
      {selected ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipValue}>{formatInteger(selected.value)}</Text>
          <Text style={styles.tooltipLabel}>flights on {selected.label}</Text>
        </View>
      ) : (
        <View style={styles.tooltipPlaceholder} />
      )}

      <View style={styles.chartCard}>
        <Svg height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%">
          {[0, 1, 2].map((line) => {
            const y = PAD.top + (innerH / 2) * line;
            return (
              <Line
                key={line}
                stroke={colors.systemGray6}
                strokeWidth={1}
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={y}
                y2={y}
              />
            );
          })}

          <Line
            stroke={colors.systemGray3}
            strokeDasharray="6 6"
            strokeWidth={1.5}
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={avgY}
            y2={avgY}
          />

          {history.map((point, index) => {
            const x = PAD.left + index * (barWidth + gap);
            const barHeight = (point.flights / maxValue) * innerH;
            return (
              <FlightsBarColumn
                barHeight={barHeight}
                barWidth={barWidth}
                chartBottom={chartBottom}
                delayMs={index * 70}
                isSelected={selected?.index === index}
                key={point.date}
                x={x}
              />
            );
          })}
        </Svg>

        <View style={styles.hitAreas}>
          {history.map((point, index) => (
            <Pressable
              key={`hit-${point.date}`}
              onPress={() => handleBarPress(index)}
              style={[
                styles.hitArea,
                { left: PAD.left + index * hitAreaWidth, width: hitAreaWidth },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.axis}>
        {history.map((point, index) => (
          <Pressable
            key={point.date}
            onPress={() => handleBarPress(index)}
            style={styles.axisItem}
          >
            <Text
              style={[
                styles.axisLabel,
                typography.caption,
                selected?.index === index && styles.axisLabelSelected,
              ]}
            >
              {point.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.avgRow}>
        <View style={styles.avgSwatch} />
        <Text style={[styles.avgText, typography.caption]}>
          7-day average: {formatInteger(avg)} flights
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  tooltip: {
    alignItems: "center",
    backgroundColor: colors.systemOrange,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "center",
  },
  tooltipValue: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 18,
  },
  tooltipLabel: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    opacity: 0.9,
  },
  tooltipPlaceholder: {
    height: 44,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: colors.systemGray6,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  hitAreas: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  hitArea: {
    height: "100%",
    position: "absolute",
  },
  empty: {
    color: colors.textSecondary,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  axisItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  axisLabel: {
    color: colors.textMuted,
    textAlign: "center",
  },
  axisLabelSelected: {
    color: colors.systemOrange,
    fontFamily: fontFamily.semiBold,
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avgSwatch: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.systemGray3,
  },
  avgText: {
    color: colors.textSecondary,
  },
});

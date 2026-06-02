import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { average, buildLinePath } from "./chart-geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type AnimatedClinicalLineChartProps = {
  animateKey: string;
  values: number[];
  labels?: string[];
  maxValue?: number;
  domainMin?: number;
  domainMax?: number;
  lineColor: string;
  gradientId: string;
  interactive?: boolean;
  compact?: boolean;
  height?: number;
  showAverageLine?: boolean;
  unit?: string;
  valueFormatter?: (value: number) => string;
};

export function AnimatedClinicalLineChart({
  animateKey,
  values,
  labels = [],
  maxValue,
  domainMin,
  domainMax,
  lineColor,
  gradientId,
  interactive = false,
  compact = false,
  height = 220,
  showAverageLine = true,
  unit,
  valueFormatter,
}: AnimatedClinicalLineChartProps) {
  const chartHeight = compact ? 120 : height;
  const width = 320;
  const pad = 14;
  const chartDomain = useMemo(
    () => ({
      min: domainMin ?? Math.min(...values),
      max: domainMax ?? maxValue ?? Math.max(...values, 1),
    }),
    [domainMax, domainMin, maxValue, values],
  );
  const avg = average(values);
  const { path, areaPath, points } = buildLinePath(
    values,
    width,
    chartHeight,
    pad,
    chartDomain,
  );
  const pathLength = Math.max(path.length * 5, 120);
  const progress = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      120,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
  }, [animateKey, path, progress]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  const avgY = useMemo(() => {
    if (values.length === 0) return chartHeight / 2;
    const innerH = chartHeight - pad * 2;
    const span = Math.max(chartDomain.max - chartDomain.min, 1);
    return pad + innerH * (1 - (avg - chartDomain.min) / span);
  }, [avg, chartDomain.max, chartDomain.min, chartHeight, pad, values.length]);

  if (values.length === 0) {
    return <Text style={styles.empty}>No data points to chart yet.</Text>;
  }

  function formatValue(value: number): string {
    if (valueFormatter) return valueFormatter(value);
    return unit ? `${value} ${unit}` : String(value);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chartCard}>
        <Svg height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} width="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity={0.32} />
              <Stop offset="100%" stopColor={lineColor} stopOpacity={0.03} />
            </LinearGradient>
          </Defs>

          {[0, 1, 2].map((line) => {
            const y = pad + ((chartHeight - pad * 2) / 2) * line;
            return (
              <Line
                key={line}
                stroke={colors.systemGray6}
                strokeWidth={1}
                x1={pad}
                x2={width - pad}
                y1={y}
                y2={y}
              />
            );
          })}

          {showAverageLine ? (
            <Line
              stroke={colors.systemGray3}
              strokeDasharray="6 6"
              strokeWidth={1.5}
              x1={pad}
              x2={width - pad}
              y1={avgY}
              y2={avgY}
            />
          ) : null}

          {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          {path ? (
            <AnimatedPath
              animatedProps={lineProps}
              d={path}
              fill="none"
              stroke={lineColor}
              strokeDasharray={pathLength}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? 2.5 : 3.5}
            />
          ) : null}

          {points.map((point, index) => (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={
                interactive && activeIndex === index ? lineColor : colors.surface
              }
              key={`${labels[index] ?? index}`}
              onPress={
                interactive && Platform.OS === "web"
                  ? () => setActiveIndex(index)
                  : undefined
              }
              r={interactive && activeIndex === index ? 6 : compact ? 3.5 : 4.5}
              stroke={lineColor}
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      {labels.length > 0 ? (
        <View style={styles.axis}>
          {labels.map((label) => (
            <Text key={label} style={styles.axisLabel}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}

      {interactive && activeIndex !== null && values[activeIndex] !== undefined ? (
        <Text style={styles.tooltip}>
          {labels[activeIndex] ?? "Point"} · {formatValue(values[activeIndex])}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: colors.systemGray6,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  axisLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    textAlign: "center",
  },
  tooltip: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

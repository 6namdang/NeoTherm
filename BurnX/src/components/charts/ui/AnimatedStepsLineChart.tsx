import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
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

import type { AppleHealthStepsHistoryPoint } from "../../../lib/healthkit";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { average, buildLinePath } from "./chart-geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHART_W = 320;
const CHART_H = 210;

type AnimatedStepsLineChartProps = {
  history: AppleHealthStepsHistoryPoint[];
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function AnimatedStepsLineChart({ history }: AnimatedStepsLineChartProps) {
  const values = useMemo(() => history.map((point) => point.steps), [history]);
  const avg = average(values);
  const maxValue = Math.max(avg, ...values, 1);

  const { path, areaPath, points } = buildLinePath(
    values.length ? values : [0],
    CHART_W,
    CHART_H,
    14,
  );
  const pathLength = Math.max(path.length * 5, 180);
  const progress = useSharedValue(0);
  const avgY = 14 + (CHART_H - 28) * (1 - avg / maxValue);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      150,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
  }, [path, progress]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  if (history.length === 0) {
    return (
      <Text style={[styles.empty, typography.body]}>
        No step samples available for the last 7 days.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chartCard}>
        <Svg height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%">
          <Defs>
            <LinearGradient id="stepsArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.systemGreen} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={colors.systemGreen} stopOpacity={0.03} />
            </LinearGradient>
            <LinearGradient id="stepsLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={colors.systemGray3} />
              <Stop offset="35%" stopColor={colors.systemGreen} />
              <Stop offset="100%" stopColor="#30D158" />
            </LinearGradient>
          </Defs>

          {[0, 1, 2].map((line) => {
            const y = 14 + ((CHART_H - 28) / 2) * line;
            return (
              <Line
                key={line}
                stroke={colors.systemGray6}
                strokeWidth={1}
                x1={14}
                x2={CHART_W - 14}
                y1={y}
                y2={y}
              />
            );
          })}

          <Line
            stroke={colors.systemGray3}
            strokeDasharray="6 6"
            strokeWidth={1.5}
            x1={14}
            x2={CHART_W - 14}
            y1={avgY}
            y2={avgY}
          />

          <Path d={areaPath} fill="url(#stepsArea)" />
          <AnimatedPath
            animatedProps={lineProps}
            d={path}
            fill="none"
            stroke="url(#stepsLine)"
            strokeDasharray={pathLength}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4}
          />

          {points.map((point, index) => (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={colors.surface}
              key={`${history[index]?.date ?? index}`}
              r={5}
              stroke={colors.systemGreen}
              strokeWidth={2.5}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.axis}>
        {history.map((point) => (
          <Text key={point.date} style={[styles.axisLabel, typography.caption]}>
            {point.label}
          </Text>
        ))}
      </View>

      <View style={styles.avgRow}>
        <View style={styles.avgSwatch} />
        <Text style={[styles.avgText, typography.caption]}>
          7-day average: {formatInteger(avg)} steps
        </Text>
      </View>
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

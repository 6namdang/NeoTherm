import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { ChartLegendItem } from "./ChartLegendItem";

type AnimatedSplitBarProps = {
  homeMinutes: number;
  outsideMinutes: number;
  caption?: string;
  compact?: boolean;
  animateKey?: string;
};

function pct(minutes: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((minutes / total) * 100)}%`;
}

function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}

export function AnimatedSplitBar({
  homeMinutes,
  outsideMinutes,
  caption,
  compact = false,
  animateKey = "default",
}: AnimatedSplitBarProps) {
  const total = homeMinutes + outsideMinutes;
  const homeRatio = total > 0 ? homeMinutes / total : 0.5;
  const awayRatio = total > 0 ? outsideMinutes / total : 0.5;
  const homeWidth = useSharedValue(0);
  const awayWidth = useSharedValue(0);

  useEffect(() => {
    homeWidth.value = 0;
    awayWidth.value = 0;
    homeWidth.value = withDelay(
      80,
      withTiming(homeRatio, { duration: 850, easing: Easing.out(Easing.cubic) }),
    );
    awayWidth.value = withDelay(
      180,
      withTiming(awayRatio, { duration: 850, easing: Easing.out(Easing.cubic) }),
    );
  }, [animateKey, awayRatio, awayWidth, homeRatio, homeWidth]);

  const homeStyle = useAnimatedStyle(() => ({
    flex: Math.max(homeWidth.value, total > 0 ? 0.001 : 0),
  }));

  const awayStyle = useAnimatedStyle(() => ({
    flex: Math.max(awayWidth.value, total > 0 ? 0.001 : 0),
  }));

  const emptyStyle = useAnimatedStyle(() => ({
    flex: total > 0 ? 0.001 : 1,
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.legendRow, compact && styles.legendRowCompact]}>
        <ChartLegendItem
          color={colors.primary}
          label="Home"
          value={`${formatHours(homeMinutes)} · ${pct(homeMinutes, total)}`}
        />
        <ChartLegendItem
          color={colors.systemOrange}
          label="Away"
          value={`${formatHours(outsideMinutes)} · ${pct(outsideMinutes, total)}`}
        />
      </View>

      <View
        accessibilityLabel={`Split: ${Math.round(homeMinutes)} minutes at home and ${Math.round(outsideMinutes)} minutes away.`}
        accessibilityRole="image"
        style={[styles.track, compact && styles.trackCompact]}
      >
        <Animated.View style={[styles.segment, styles.home, homeStyle]} />
        <Animated.View style={[styles.segment, styles.outside, awayStyle]} />
        <Animated.View style={[styles.segment, styles.empty, emptyStyle]} />
      </View>

      {caption ? (
        <Text style={[styles.caption, typography.caption]}>{caption}</Text>
      ) : null}
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
  legendRowCompact: {
    gap: spacing.xs,
  },
  track: {
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.systemGray6,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.divider,
  },
  trackCompact: {
    height: 24,
  },
  segment: {
    height: "100%",
  },
  home: {
    backgroundColor: colors.primary,
  },
  outside: {
    backgroundColor: colors.systemOrange,
  },
  empty: {
    backgroundColor: colors.systemGray6,
  },
  caption: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  /** Visible questions answered so far (branch-aware); bar never hits 100% until the current screen is answered. */
  answered: number;
  /** Total visible questions for this path (updates when branching reveals more steps). */
  total: number;
  onLayoutBarWidth?: (w: number) => void;
};

export function FormProgress({ answered, total, onLayoutBarWidth }: Props) {
  const progress = Math.min(1, Math.max(0, answered / Math.max(total, 1)));
  const trackW = useSharedValue(0);
  const fillW = useSharedValue(0);
  const [ready, setReady] = useState(false);
  const denom = Math.max(total, 1);

  useEffect(() => {
    if (!ready || trackW.value <= 0) return;
    fillW.value = withTiming(trackW.value * progress, { duration: 320 });
  }, [progress, ready, fillW, trackW]);

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(fillW.value, 0),
  }));

  function onTrackLayout(e: LayoutChangeEvent): void {
    const w = e.nativeEvent.layout.width;
    onLayoutBarWidth?.(w);
    trackW.value = w;
    fillW.value = w * progress;
    setReady(true);
  }

  const pct = Math.round(progress * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.metaRow}>
        <Text
          accessibilityRole="header"
          style={[styles.progressLabel, typography.micro]}
        >
          Progress
        </Text>
        <Text
          accessibilityRole="text"
          style={[styles.fraction, typography.caption]}
        >
          {`${answered} of ${denom} answered`}
          <Text style={styles.pctMuted}>{` · ${pct}%`}</Text>
        </Text>
      </View>
      <View style={styles.track} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const TRACK_H = 8;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.md,
  },
  progressLabel: {
    color: colors.primary,
    letterSpacing: 0.6,
  },
  fraction: {
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  pctMuted: {
    color: colors.textMuted,
    fontFamily: typography.caption.fontFamily,
  },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
    width: "100%",
    position: "relative",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: TRACK_H / 2,
  },
});

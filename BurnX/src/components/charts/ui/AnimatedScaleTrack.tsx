import { useEffect, useMemo, useState } from "react";
import { PixelRatio, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

type AnimatedScaleTrackProps = {
  scaleMin: number;
  scaleMax: number;
  tScore: number | null;
  tickValues: number[];
  animateKey: string;
  barHeight?: number;
  dotColor?: string;
  compact?: boolean;
  showScaleLabels?: boolean;
  renderTick?: (
    tick: number,
    leftPx: number | null,
    pct: number,
  ) => React.ReactNode;
};

function pctFromScore(value: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

export function AnimatedScaleTrack({
  scaleMin,
  scaleMax,
  tScore,
  tickValues,
  animateKey,
  barHeight = 14,
  dotColor = colors.primary,
  compact = false,
  showScaleLabels = true,
  renderTick,
}: AnimatedScaleTrackProps) {
  const gradientId = useMemo(
    () => `scaleTrack_${Math.random().toString(36).slice(2, 9)}`,
    [],
  );
  const [trackWidth, setTrackWidth] = useState(0);
  const targetPct = tScore !== null ? pctFromScore(tScore, scaleMin, scaleMax) : 0;
  const dotLeft = useSharedValue(0);

  useEffect(() => {
    dotLeft.value = 0;
    dotLeft.value = withTiming(targetPct, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [animateKey, dotLeft, targetPct]);

  const dotStyle = useAnimatedStyle(() => ({
    left: `${dotLeft.value * 100}%`,
    transform: [{ translateX: -8 }],
  }));

  return (
    <View style={styles.block}>
      {showScaleLabels ? (
        <View style={styles.labels}>
          <Text style={styles.label}>{scaleMin}</Text>
          <Text style={styles.label}>{scaleMax}</Text>
        </View>
      ) : null}
      <View
        style={[styles.track, compact && styles.trackCompact]}
        onLayout={(event) => {
          const width = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.width);
          if (width > 0) setTrackWidth(width);
        }}
      >
        <View style={[styles.gradientWrap, { height: barHeight, borderRadius: barHeight / 2 }]}>
          {trackWidth > 0 ? (
            <Svg height={barHeight} width={trackWidth}>
              <Defs>
                <LinearGradient
                  gradientUnits="userSpaceOnUse"
                  id={gradientId}
                  x1={0}
                  x2={trackWidth}
                  y1={0}
                  y2={0}
                >
                  <Stop offset="0" stopColor="#22C55E" />
                  <Stop offset="0.5" stopColor="#F59E0B" />
                  <Stop offset="1" stopColor="#DC2626" />
                </LinearGradient>
              </Defs>
              <Rect
                fill={`url(#${gradientId})`}
                height={barHeight}
                rx={barHeight / 2}
                ry={barHeight / 2}
                width={trackWidth}
              />
            </Svg>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {tickValues.map((tick) => {
          const pct = pctFromScore(tick, scaleMin, scaleMax);
          const leftPx = trackWidth > 0 ? pct * trackWidth : null;
          if (renderTick) return renderTick(tick, leftPx, pct);
          return (
            <View
              key={tick}
              pointerEvents="none"
              style={[
                styles.tick,
                leftPx !== null
                  ? { left: leftPx, transform: [{ translateX: -1 }] }
                  : { left: `${pct * 100}%` as `${number}%`, marginLeft: -1 },
              ]}
            />
          );
        })}

        {tScore !== null ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dot,
              { backgroundColor: dotColor, top: 17 - (compact ? 4 : 0) },
              dotStyle,
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    fontSize: 11,
  },
  track: {
    minHeight: 72,
    position: "relative",
    marginHorizontal: spacing.xs,
  },
  trackCompact: {
    minHeight: 56,
  },
  gradientWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 18,
    overflow: "hidden",
    backgroundColor: colors.systemGray6,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.systemGray6,
  },
  tick: {
    position: "absolute",
    top: 14,
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  dot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 4,
  },
});

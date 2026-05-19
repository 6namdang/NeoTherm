import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

type SkeletonBlockProps = {
  height?: number;
  width?: DimensionValue;
  borderRadius?: number;
  accessibilityLabel?: string;
};

/** Subtle pulse — clinical UI; avoids distracting motion */
export function SkeletonBlock({
  height = 14,
  width = "100%",
  borderRadius: br = radius.sm,
  accessibilityLabel,
}: SkeletonBlockProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.45, {
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel ?? "Loading"}
      accessibilityRole="progressbar"
      style={[
        styles.block,
        { height, width, borderRadius: br },
        style,
      ]}
    />
  );
}

function SkeletonRowCard() {
  return (
    <View style={styles.rowCard}>
      <SkeletonBlock borderRadius={radius.md} height={40} width={40} />
      <View style={styles.rowText}>
        <SkeletonBlock borderRadius={6} height={14} />
        <SkeletonBlock borderRadius={6} height={12} width="72%" />
      </View>
    </View>
  );
}

export function SkeletonClinicalTable({ rows = 4 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Loading list" accessibilityRole="progressbar" style={styles.table}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRowCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.borderStrong,
  },
  table: {
    gap: spacing.md,
    width: "100%",
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    gap: spacing.sm,
  },
});

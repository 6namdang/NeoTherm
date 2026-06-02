import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { radius } from "../../../theme/spacing";

type AnimatedStackSegmentProps = {
  filled: boolean;
  color: string;
  delayMs?: number;
  animateKey: string;
};

export function AnimatedStackSegment({
  filled,
  color,
  delayMs = 0,
  animateKey,
}: AnimatedStackSegmentProps) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = 0.2;
    opacity.value = 0.35;
    if (!filled) return;
    scale.value = withDelay(
      delayMs,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
  }, [animateKey, delayMs, filled, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
    opacity: opacity.value,
    backgroundColor: filled ? color : "rgba(148, 163, 184, 0.18)",
  }));

  return <Animated.View style={[styles.segment, style]} />;
}

const styles = StyleSheet.create({
  segment: {
    height: 10,
    borderRadius: radius.sm,
  },
});

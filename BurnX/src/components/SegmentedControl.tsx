import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentLayout = { x: number; width: number; height: number };

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

const THUMB_SPRING = { damping: 20, stiffness: 260, mass: 0.85 };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = useMemo(() => {
    const i = options.findIndex((opt) => opt.value === value);
    return Math.max(0, i);
  }, [options, value]);

  const layoutsRef = useRef<(SegmentLayout | undefined)[]>([]);
  const [measuredRevision, setMeasuredRevision] = useState(0);
  const [allMeasured, setAllMeasured] = useState(false);

  const thumbX = useSharedValue(0);
  const thumbW = useSharedValue(0);
  const thumbH = useSharedValue(0);

  const moveThumbToIndex = (index: number, snapshot?: (SegmentLayout | undefined)[]) => {
    const source = snapshot ?? layoutsRef.current;
    const segment = source[index];
    if (!segment?.width) return;
    thumbX.value = withSpring(segment.x, THUMB_SPRING);
    thumbW.value = withSpring(segment.width, THUMB_SPRING);
    thumbH.value = withSpring(segment.height || 44, THUMB_SPRING);
  };

  const onSegmentLayout = (index: number) => (event: LayoutChangeEvent) => {
    const {
      nativeEvent: { layout },
    } = event;
    layoutsRef.current[index] = {
      x: layout.x,
      width: layout.width,
      height: layout.height || 44,
    };

    const ready = layoutsRef.current.filter((s) => s && s.width > 0).length === options.length;
    setMeasuredRevision((n) => n + 1);
    if (ready) setAllMeasured(true);

    const snap = [...layoutsRef.current];
    moveThumbToIndex(activeIndex, snap);
  };

  useEffect(() => {
    moveThumbToIndex(activeIndex);
    // Thumb shared values intentionally excluded — movement is driven via withSpring assignments.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when segment selection or layouts change
  }, [activeIndex, measuredRevision]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
    width: thumbW.value,
    height: thumbH.value,
  }));

  return (
    <View accessibilityRole="tablist" style={styles.track}>
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, allMeasured ? styles.thumbOpaque : styles.thumbHidden, thumbStyle]}
      />
      {options.map((opt, index) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [styles.segmentTouchable, pressed && styles.segmentTouchablePressed]}
            onLayout={onSegmentLayout(index)}
            onPress={() => onChange(opt.value)}
          >
            <View style={styles.segmentInner}>
              <Text
                style={[styles.segmentText, selected ? styles.segmentTextActive : styles.segmentTextIdle]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    position: "relative",
  },
  thumb: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  thumbOpaque: {
    opacity: 1,
  },
  thumbHidden: {
    opacity: 0,
  },
  segmentTouchable: {
    flex: 1,
    zIndex: 1,
  },
  segmentTouchablePressed: {
    opacity: 0.92,
  },
  segmentInner: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  segmentText: {
    ...typography.caption,
  },
  segmentTextActive: {
    color: colors.text,
  },
  segmentTextIdle: {
    color: colors.textMuted,
  },
});

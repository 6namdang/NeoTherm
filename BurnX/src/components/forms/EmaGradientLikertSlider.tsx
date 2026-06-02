import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  PixelRatio,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import {
  colorFromLikertValue,
  likertValueFromTrackPosition,
  trackPositionFromLikertValue,
  type EmaLikertPolarity,
} from "../../lib/ema-likert-gradient";
import {
  emaAccessibilitySummary,
  emaEndpointDescriptor,
  emaVerbalDescriptor,
} from "../../lib/ema-vas-config";
import { Card } from "../Card";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  questionText: string;
  labels: string[];
  polarity: EmaLikertPolarity;
  onValueChange: (index: number) => void;
  sectionTitle?: string;
  sectionInstructions?: string;
  selectedOptionIndex?: number | null;
  interactionDisabled?: boolean;
};

const TRACK_H = 14;
const THUMB_SIZE = 28;
const TICK_VALUES = [0, 2, 4, 6, 8, 10] as const;
const TICK_SLOT_W = 24;

function innerTrackWidth(trackWidth: number): number {
  return Math.max(0, trackWidth - THUMB_SIZE);
}

function positionFromLocalX(localX: number, trackWidth: number): number {
  const travel = innerTrackWidth(trackWidth);
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, (localX - THUMB_SIZE / 2) / travel));
}

function thumbLeftFromPosition(position: number, trackWidth: number): number {
  return position * innerTrackWidth(trackWidth);
}

export function EmaGradientLikertSlider({
  questionText,
  labels,
  polarity,
  onValueChange,
  sectionTitle,
  sectionInstructions,
  selectedOptionIndex = null,
  interactionDisabled = false,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const gradientId = useMemo(
    () => `emaLikert_${Math.random().toString(36).slice(2, 9)}`,
    [],
  );
  const thumbX = useSharedValue(0);
  const hasSelection = useSharedValue(selectedOptionIndex !== null ? 1 : 0);

  const travel = innerTrackWidth(trackWidth);

  const leftLabel = useMemo(
    () =>
      polarity === "lowerIsBetter"
        ? emaEndpointDescriptor(labels, labels.length - 1, "Worst")
        : emaEndpointDescriptor(labels, 0, "Worst"),
    [labels, polarity],
  );
  const rightLabel = useMemo(
    () =>
      polarity === "lowerIsBetter"
        ? emaEndpointDescriptor(labels, 0, "Best")
        : emaEndpointDescriptor(labels, labels.length - 1, "Best"),
    [labels, polarity],
  );

  const syncThumbToValue = useCallback(
    (value: number) => {
      if (trackWidth <= 0) return;
      const pct = trackPositionFromLikertValue(value, polarity);
      thumbX.value = thumbLeftFromPosition(pct, trackWidth);
      hasSelection.value = 1;
    },
    [hasSelection, polarity, thumbX, trackWidth],
  );

  const updateFromLocalX = useCallback(
    (localX: number) => {
      if (trackWidth <= 0 || interactionDisabled) return;
      const position = positionFromLocalX(localX, trackWidth);
      const value = likertValueFromTrackPosition(position, polarity);
      const snappedPosition = trackPositionFromLikertValue(value, polarity);
      thumbX.value = thumbLeftFromPosition(snappedPosition, trackWidth);
      hasSelection.value = 1;
      onValueChange(value);
    },
    [interactionDisabled, onValueChange, polarity, thumbX, trackWidth, hasSelection],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !interactionDisabled,
        onMoveShouldSetPanResponder: () => !interactionDisabled,
        onPanResponderGrant: (event) => {
          updateFromLocalX(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateFromLocalX(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event) => {
          updateFromLocalX(event.nativeEvent.locationX);
        },
      }),
    [interactionDisabled, updateFromLocalX],
  );

  useEffect(() => {
    if (
      selectedOptionIndex !== null &&
      selectedOptionIndex !== undefined &&
      trackWidth > 0
    ) {
      syncThumbToValue(selectedOptionIndex);
    }
  }, [selectedOptionIndex, syncThumbToValue, trackWidth]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const width = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.width);
    if (width <= 0) return;
    setTrackWidth(width);
    if (selectedOptionIndex !== null && selectedOptionIndex !== undefined) {
      syncThumbToValue(selectedOptionIndex);
    }
  };

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: hasSelection.value > 0 ? 1 : 0.4,
    transform: [{ translateX: thumbX.value }],
  }));

  const displayValue =
    selectedOptionIndex !== null && selectedOptionIndex !== undefined
      ? selectedOptionIndex
      : null;
  const displayColor =
    displayValue !== null
      ? colorFromLikertValue(displayValue, polarity)
      : colors.textMuted;
  const descriptorText =
    displayValue !== null ? emaVerbalDescriptor(labels, displayValue) : "";
  const accessibilitySummary = emaAccessibilitySummary(labels, displayValue);

  return (
    <Card variant="elevated" style={styles.card}>
      {sectionTitle ? (
        <Text style={[styles.sectionKicker, typography.micro]} numberOfLines={2}>
          {sectionTitle}
        </Text>
      ) : null}
      {sectionInstructions ? (
        <Text style={[styles.sectionHint, typography.caption]} numberOfLines={4}>
          {sectionInstructions}
        </Text>
      ) : null}

      <Text style={[styles.question, typography.title]} accessibilityRole="header">
        {questionText}
      </Text>

      <View
        style={styles.scoreBlock}
        accessibilityLiveRegion="polite"
        accessibilityLabel={accessibilitySummary}
      >
        {displayValue === null ? (
          <Text style={[styles.prompt, typography.body]}>Drag the slider to rate</Text>
        ) : descriptorText !== "" ? (
          <Text
            style={[styles.descriptor, typography.title, { color: displayColor }]}
            numberOfLines={2}
          >
            {descriptorText}
          </Text>
        ) : null}
      </View>

      <View
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={questionText}
        accessibilityHint="Drag left for negative and right for positive"
        accessibilityState={{
          disabled: interactionDisabled,
        }}
        style={styles.trackWrap}
        onLayout={onTrackLayout}
      >
        <View
          style={[
            styles.trackShell,
            {
              height: TRACK_H,
              borderRadius: TRACK_H / 2,
              marginHorizontal: THUMB_SIZE / 2,
            },
          ]}
        >
          {travel > 0 ? (
            <Svg height={TRACK_H} width={travel}>
              <Defs>
                <LinearGradient
                  gradientUnits="userSpaceOnUse"
                  id={gradientId}
                  x1={0}
                  x2={travel}
                  y1={0}
                  y2={0}
                >
                  <Stop offset="0" stopColor="#EF4444" />
                  <Stop offset="0.33" stopColor="#F97316" />
                  <Stop offset="0.66" stopColor="#EAB308" />
                  <Stop offset="1" stopColor="#22C55E" />
                </LinearGradient>
              </Defs>
              <Rect
                fill={`url(#${gradientId})`}
                height={TRACK_H}
                rx={TRACK_H / 2}
                ry={TRACK_H / 2}
                width={travel}
              />
            </Svg>
          ) : (
            <View style={styles.trackPlaceholder} />
          )}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor:
                displayValue !== null ? displayColor : colors.systemGray3,
            },
            thumbStyle,
          ]}
        />
      </View>

      <View style={styles.endpointRow}>
        <Text style={[styles.endpoint, typography.micro]}>{leftLabel}</Text>
        <Text style={[styles.endpointCenter, typography.micro]}>Neutral</Text>
        <Text style={[styles.endpoint, typography.micro, styles.endpointRight]}>
          {rightLabel}
        </Text>
      </View>

      {trackWidth > THUMB_SIZE ? (
        <View style={[styles.tickRow, { width: trackWidth }]}>
          {TICK_VALUES.map((tick) => {
            const position = trackPositionFromLikertValue(tick, polarity);
            const centerX = THUMB_SIZE / 2 + position * travel;
            const isActive = displayValue === tick;
            return (
              <View
                key={tick}
                style={[
                  styles.tickSlot,
                  { left: centerX - TICK_SLOT_W / 2, width: TICK_SLOT_W },
                ]}
              >
                <Text
                  style={[
                    styles.tickLabel,
                    typography.micro,
                    isActive && styles.tickLabelActive,
                    isActive && { color: displayColor },
                  ]}
                >
                  {tick}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg + 2,
    marginTop: spacing.xs,
  },
  sectionKicker: {
    color: colors.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  sectionHint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  question: {
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  scoreBlock: {
    alignItems: "center",
    marginBottom: spacing.lg,
    minHeight: 32,
    justifyContent: "center",
  },
  descriptor: {
    textAlign: "center",
    lineHeight: 28,
    paddingHorizontal: spacing.md,
  },
  prompt: {
    color: colors.textMuted,
    textAlign: "center",
  },
  trackWrap: {
    minHeight: THUMB_SIZE + spacing.sm,
    justifyContent: "center",
  },
  trackShell: {
    overflow: "hidden",
    backgroundColor: colors.systemGray6,
  },
  trackPlaceholder: {
    flex: 1,
    backgroundColor: colors.systemGray6,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    marginTop: -THUMB_SIZE / 2,
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  endpointRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  endpoint: {
    flex: 1,
    color: colors.textMuted,
  },
  endpointCenter: {
    color: colors.textSecondary,
    textAlign: "center",
    flex: 1,
  },
  endpointRight: {
    textAlign: "right",
  },
  tickRow: {
    position: "relative",
    alignSelf: "center",
    height: 20,
    marginTop: spacing.sm,
  },
  tickSlot: {
    position: "absolute",
    alignItems: "center",
  },
  tickLabel: {
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  tickLabelActive: {
    fontWeight: "700",
  },
});

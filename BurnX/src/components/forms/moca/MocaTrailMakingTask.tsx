import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";

import {
  MOCA_TRAIL_NODES,
  type MocaTrailNode,
  type MocaTrailNodeId,
} from "../../../constants/forms/moca";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

const CANVAS_ASPECT = 4 / 3;
const NODE_RADIUS = 18;
const HIT_RADIUS = 32;
const STROKE = 2.5;

/** Future submit payload field: `visuospatial_trail_sequence` — raw tap order, scored server-side or via scoreMocaTrail(). */
export type MocaTrailTapSequence = MocaTrailNodeId[];

type Point = { x: number; y: number };

function nodeById(id: MocaTrailNodeId): MocaTrailNode {
  const node = MOCA_TRAIL_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown trail node: ${id}`);
  return node;
}

function toCanvasPoint(node: MocaTrailNode, width: number, height: number): Point {
  return { x: node.x * width, y: node.y * height };
}

export function MocaTrailMakingTask({
  sequence,
  onSequenceChange,
}: {
  sequence: MocaTrailTapSequence;
  onSequenceChange: (sequence: MocaTrailTapSequence) => void;
}) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const selectedSet = useMemo(() => new Set(sequence), [sequence]);

  const onCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width <= 0) return;
    setCanvasSize({ width, height: width / CANVAS_ASPECT });
  }, []);

  const segments = useMemo(() => {
    if (canvasSize.width <= 0) return [];
    const out: Array<{ from: Point; to: Point }> = [];
    for (let i = 1; i < sequence.length; i += 1) {
      const fromNode = nodeById(sequence[i - 1]!);
      const toNode = nodeById(sequence[i]!);
      out.push({
        from: toCanvasPoint(fromNode, canvasSize.width, canvasSize.height),
        to: toCanvasPoint(toNode, canvasSize.width, canvasSize.height),
      });
    }
    return out;
  }, [canvasSize.height, canvasSize.width, sequence]);

  function reset() {
    onSequenceChange([]);
  }

  function onNodePress(nodeId: MocaTrailNodeId) {
    if (selectedSet.has(nodeId)) return;

    onSequenceChange([...sequence, nodeId]);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>VISUOSPATIAL / EXECUTIVE</Text>
      </View>

      <Text style={[styles.prompt, typography.body]}>
        Please draw a line going from a number to a letter in ascending order. Tap
        each circle in the order you connect them — you may start and stop on any
        circle.
      </Text>

      <View onLayout={onCanvasLayout} style={styles.canvasWrap}>
        {canvasSize.width > 0 ? (
          <>
            <Svg
              height={canvasSize.height}
              pointerEvents="none"
              style={styles.canvasSvg}
              width={canvasSize.width}
            >
              {segments.map((seg, i) => (
                <Line
                  key={`user-${i}`}
                  stroke={colors.success}
                  strokeWidth={STROKE}
                  x1={seg.from.x}
                  x2={seg.to.x}
                  y1={seg.from.y}
                  y2={seg.to.y}
                />
              ))}

              {MOCA_TRAIL_NODES.map((node) => {
                const pt = toCanvasPoint(node, canvasSize.width, canvasSize.height);
                const selected = selectedSet.has(node.id);
                return (
                  <Circle
                    key={node.id}
                    cx={pt.x}
                    cy={pt.y}
                    fill={selected ? colors.successSoft : colors.surface}
                    r={NODE_RADIUS}
                    stroke={selected ? colors.success : colors.borderStrong}
                    strokeWidth={selected ? 2.5 : 1.5}
                  />
                );
              })}

              {MOCA_TRAIL_NODES.map((node) => {
                const pt = toCanvasPoint(node, canvasSize.width, canvasSize.height);
                return (
                  <SvgText
                    key={`label-${node.id}`}
                    fill={selectedSet.has(node.id) ? colors.success : colors.text}
                    fontFamily={fontFamily.semiBold}
                    fontSize={14}
                    textAnchor="middle"
                    x={pt.x}
                    y={pt.y + 5}
                  >
                    {node.id}
                  </SvgText>
                );
              })}
            </Svg>

            {MOCA_TRAIL_NODES.map((node) => {
              const pt = toCanvasPoint(node, canvasSize.width, canvasSize.height);
              const selected = selectedSet.has(node.id);
              return (
                <View
                  key={`hit-${node.id}`}
                  pointerEvents="box-none"
                  style={[
                    styles.hitTarget,
                    {
                      left: pt.x - HIT_RADIUS,
                      top: pt.y - HIT_RADIUS,
                      width: HIT_RADIUS * 2,
                      height: HIT_RADIUS * 2,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityHint="Adds this circle to your trail path"
                    accessibilityLabel={`Trail node ${node.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={selected}
                    onPress={() => onNodePress(node.id)}
                    style={({ pressed }) => [
                      styles.hitPressable,
                      pressed && !selected && styles.hitPressed,
                    ]}
                  />
                </View>
              );
            })}
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={reset} style={styles.resetLink}>
          <Text style={[styles.resetText, typography.caption]}>Start over</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionHeaderText: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  prompt: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  canvasWrap: {
    width: "100%",
    aspectRatio: CANVAS_ASPECT,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  canvasSvg: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  hitTarget: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  hitPressable: {
    width: "100%",
    height: "100%",
    borderRadius: HIT_RADIUS,
  },
  hitPressed: {
    backgroundColor: colors.overlay,
  },
  footer: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  resetLink: {
    paddingVertical: spacing.xs,
  },
  resetText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
});

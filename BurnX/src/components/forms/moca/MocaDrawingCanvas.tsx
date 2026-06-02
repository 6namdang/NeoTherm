import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MocaDrawingStroke } from "../../../constants/forms/moca";
import { colors } from "../../../theme/colors";
import { radius, spacing } from "../../../theme/spacing";

const CANVAS_ASPECT = 4 / 3;
const STROKE_WIDTH = 3;

type Point = { x: number; y: number };

function touchPoint(event: GestureResponderEvent): Point {
  return {
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  };
}

function pointsToPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first!.x} ${first!.y}${rest.map((p) => ` L ${p.x} ${p.y}`).join("")}`;
}

function normalizeStrokes(
  strokes: readonly MocaDrawingStroke[],
  width: number,
  height: number,
): Point[][] {
  if (width <= 0 || height <= 0) return [];
  return strokes.map((stroke) =>
    stroke.points.map((p) => ({ x: p.x * width, y: p.y * height })),
  );
}

function denormalizePoint(point: Point, width: number, height: number): MocaDrawingStroke["points"][number] {
  return {
    x: Math.min(1, Math.max(0, point.x / width)),
    y: Math.min(1, Math.max(0, point.y / height)),
  };
}

type MocaDrawingCanvasProps = {
  strokes: MocaDrawingStroke[];
  onStrokesChange: (strokes: MocaDrawingStroke[]) => void;
};

export function MocaDrawingCanvas({ strokes, onStrokesChange }: MocaDrawingCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const sizeRef = useRef(canvasSize);
  sizeRef.current = canvasSize;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width <= 0) return;
    setCanvasSize({ width, height: width / CANVAS_ASPECT });
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          setLivePoints([touchPoint(event)]);
        },
        onPanResponderMove: (event) => {
          const pt = touchPoint(event);
          setLivePoints((prev) => [...prev, pt]);
        },
        onPanResponderRelease: () => {
          setLivePoints((prev) => {
            if (prev.length === 0) return [];
            const { width, height } = sizeRef.current;
            if (width <= 0 || height <= 0) return [];
            const normalized = prev.map((p) => denormalizePoint(p, width, height));
            onStrokesChange([
              ...strokesRef.current,
              { points: normalized },
            ]);
            return [];
          });
        },
        onPanResponderTerminate: () => {
          setLivePoints([]);
        },
      }),
    [onStrokesChange],
  );

  const renderedStrokes = useMemo(
    () => normalizeStrokes(strokes, canvasSize.width, canvasSize.height),
    [canvasSize.height, canvasSize.width, strokes],
  );

  return (
    <View onLayout={onLayout} style={styles.canvasWrap} {...panResponder.panHandlers}>
      {canvasSize.width > 0 ? (
        <Svg
          height={canvasSize.height}
          pointerEvents="none"
          style={styles.canvasSvg}
          width={canvasSize.width}
        >
          {renderedStrokes.map((points, i) => (
            <Path
              key={`stroke-${i}`}
              d={pointsToPath(points)}
              fill="none"
              stroke={colors.text}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={STROKE_WIDTH}
            />
          ))}
          {livePoints.length > 0 ? (
            <Path
              d={pointsToPath(livePoints)}
              fill="none"
              stroke={colors.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={STROKE_WIDTH}
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});

import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  PixelRatio,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MocaDrawingStroke } from "../../../constants/forms/moca";
import { colors } from "../../../theme/colors";
import { radius } from "../../../theme/spacing";

const CANVAS_ASPECT = 4 / 3;
const STROKE_WIDTH = 3;

type Point = { x: number; y: number };
type CanvasSize = { width: number; height: number };

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

function denormalizePoint(
  point: Point,
  width: number,
  height: number,
): MocaDrawingStroke["points"][number] {
  return {
    x: Math.min(1, Math.max(0, point.x / width)),
    y: Math.min(1, Math.max(0, point.y / height)),
  };
}

function sameCanvasSize(a: CanvasSize, b: CanvasSize): boolean {
  return a.width === b.width && a.height === b.height;
}

type MocaDrawingCanvasProps = {
  strokes: MocaDrawingStroke[];
  onStrokesChange: (strokes: MocaDrawingStroke[]) => void;
  /** Called while the user is actively drawing — use to disable parent ScrollView. */
  onDrawingActiveChange?: (active: boolean) => void;
};

export function MocaDrawingCanvas({
  strokes,
  onStrokesChange,
  onDrawingActiveChange,
}: MocaDrawingCanvasProps) {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [livePoints, setLivePoints] = useState<Point[]>([]);

  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const sizeRef = useRef(canvasSize);
  sizeRef.current = canvasSize;
  const livePointsRef = useRef<Point[]>([]);
  const drawingActiveRef = useRef(false);
  const onDrawingActiveChangeRef = useRef(onDrawingActiveChange);
  onDrawingActiveChangeRef.current = onDrawingActiveChange;

  const setDrawingActive = useCallback((active: boolean) => {
    if (drawingActiveRef.current === active) return;
    drawingActiveRef.current = active;
    onDrawingActiveChangeRef.current?.(active);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const width = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.width);
    const height = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.height);
    if (width <= 0 || height <= 0) return;
    setCanvasSize((prev) => {
      const next = { width, height };
      return sameCanvasSize(prev, next) ? prev : next;
    });
  }, []);

  const commitLiveStroke = useCallback(() => {
    const points = livePointsRef.current;
    livePointsRef.current = [];
    setLivePoints([]);
    setDrawingActive(false);

    if (points.length === 0) return;
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    onStrokesChange([
      ...strokesRef.current,
      { points: points.map((p) => denormalizePoint(p, width, height)) },
    ]);
  }, [onStrokesChange, setDrawingActive]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
          const pt = touchPoint(event);
          livePointsRef.current = [pt];
          setLivePoints([pt]);
          setDrawingActive(true);
        },
        onPanResponderMove: (event) => {
          const pt = touchPoint(event);
          livePointsRef.current = [...livePointsRef.current, pt];
          setLivePoints(livePointsRef.current);
        },
        onPanResponderRelease: commitLiveStroke,
        onPanResponderTerminate: () => {
          livePointsRef.current = [];
          setLivePoints([]);
          setDrawingActive(false);
        },
      }),
    [commitLiveStroke, setDrawingActive],
  );

  const renderedStrokes = useMemo(
    () => normalizeStrokes(strokes, canvasSize.width, canvasSize.height),
    [canvasSize.height, canvasSize.width, strokes],
  );

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={[
        styles.canvasWrap,
        canvasSize.height > 0 ? { height: canvasSize.height } : null,
      ]}
      {...panResponder.panHandlers}
    >
      {canvasSize.width > 0 && canvasSize.height > 0 ? (
        <Svg
          height={canvasSize.height}
          pointerEvents="none"
          style={styles.canvasSvg}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
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
    ...StyleSheet.absoluteFillObject,
  },
});

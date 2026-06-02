import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../../theme/colors";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type AnimatedArcGaugeProps = {
  value: number | null;
  maxValue: number;
  animateKey: string;
  trackStroke?: string;
  valueStroke?: string;
  knobColor?: string;
  tickTotals?: number[];
  layout?: { h: number; cyOffset?: number; r: number };
  strokeLinecap?: "butt" | "round";
  childrenDefs?: ReactNode;
  accentColor?: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function AnimatedArcGauge({
  value,
  maxValue,
  animateKey,
  trackStroke = colors.systemGray6,
  valueStroke,
  knobColor,
  layout = { h: 132, cyOffset: 8, r: 96 },
  strokeLinecap = "round",
  childrenDefs,
  accentColor,
}: AnimatedArcGaugeProps) {
  const stroke = valueStroke ?? accentColor ?? colors.primary;
  const knob = knobColor ?? accentColor ?? colors.primary;
  const width = layout.r * 2 + 24;
  const cx = width / 2;
  const cy = layout.h - (layout.cyOffset ?? 0);
  const startDeg = 180;
  const endDeg = 360;
  const track = arcPath(cx, cy, layout.r, startDeg, endDeg);
  const ratio =
    value !== null && maxValue > 0
      ? Math.min(1, Math.max(0, value / maxValue))
      : 0;
  const valueEnd = startDeg + (endDeg - startDeg) * ratio;
  const valueArc = arcPath(cx, cy, layout.r, startDeg, Math.max(startDeg + 0.01, valueEnd));
  const knobPoint = polar(cx, cy, layout.r, valueEnd);
  const pathLength = layout.r * Math.PI;
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withTiming(ratio, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [animateKey, ratio, sweep]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - sweep.value),
  }));

  return (
    <View style={styles.wrap}>
      <Svg height={layout.h} width={width}>
        {childrenDefs}
        <Path
          d={track}
          fill="none"
          stroke={trackStroke}
          strokeLinecap={strokeLinecap}
          strokeWidth={14}
        />
        {value !== null ? (
          <>
            <AnimatedPath
              animatedProps={animatedProps}
              d={valueArc}
              fill="none"
              stroke={stroke}
              strokeDasharray={pathLength}
              strokeLinecap={strokeLinecap}
              strokeWidth={14}
            />
            <Circle
              cx={knobPoint.x}
              cy={knobPoint.y}
              fill={knob}
              r={8}
              stroke={colors.surface}
              strokeWidth={2}
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
});

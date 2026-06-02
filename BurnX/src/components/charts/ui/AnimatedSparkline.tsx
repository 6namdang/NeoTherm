import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { colors } from "../../../theme/colors";
import { buildLinePath } from "./chart-geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type AnimatedSparklineProps = {
  values: number[];
  color: string;
  height?: number;
};

export function AnimatedSparkline({
  values,
  color,
  height = 52,
}: AnimatedSparklineProps) {
  const width = 148;
  const progress = useSharedValue(0);
  const { path, areaPath, points } = buildLinePath(values, width, height, 6);
  const pathLength = Math.max(path.length * 4, 120);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      120,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [path, progress]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  if (values.length < 2 || !path) {
    return <View style={[styles.placeholder, { height }]} />;
  }

  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <AnimatedPath
          animatedProps={lineProps}
          d={path}
          fill="none"
          stroke={color}
          strokeDasharray={pathLength}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
        {points.map((point, index) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={colors.surface}
            key={`${point.x}-${point.y}-${index}`}
            r={2.5}
            stroke={color}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  placeholder: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.systemGray6,
  },
});

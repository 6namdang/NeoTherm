import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { colors } from "../../../theme/colors";
import { radius, spacing } from "../../../theme/spacing";

const SIZE = 120;
const STROKE = 2;

/** Isometric wireframe cube matching the MoCA reference figure. */
export function MocaReferenceCube() {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 6;
  const s = 44;

  const front = [
    { x: cx - s, y: cy + s * 0.35 },
    { x: cx + s * 0.55, y: cy + s * 0.35 },
    { x: cx + s * 0.55, y: cy + s * 1.15 },
    { x: cx - s, y: cy + s * 1.15 },
  ];
  const back = front.map((p) => ({ x: p.x + s * 0.45, y: p.y - s * 0.55 }));

  const edges: Array<[typeof front[0], typeof front[0]]> = [
    [front[0]!, front[1]!],
    [front[1]!, front[2]!],
    [front[2]!, front[3]!],
    [front[3]!, front[0]!],
    [back[0]!, back[1]!],
    [back[1]!, back[2]!],
    [back[2]!, back[3]!],
    [back[3]!, back[0]!],
    [front[0]!, back[0]!],
    [front[1]!, back[1]!],
    [front[2]!, back[2]!],
    [front[3]!, back[3]!],
  ];

  return (
    <View style={styles.wrap}>
      <Svg height={SIZE} width={SIZE}>
        {edges.map(([a, b], i) => (
          <Line
            key={`edge-${i}`}
            stroke={colors.text}
            strokeWidth={STROKE}
            x1={a.x}
            x2={b.x}
            y1={a.y}
            y2={b.y}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
});

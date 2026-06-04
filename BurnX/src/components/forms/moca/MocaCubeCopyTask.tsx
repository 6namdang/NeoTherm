import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MocaDrawingStroke } from "../../../constants/forms/moca";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { MocaDrawingCanvas } from "./MocaDrawingCanvas";
import { MocaReferenceCube } from "./MocaReferenceCube";

/** Future submit payload field: `visuospatial_cube_drawing` — normalized stroke paths. */
export type MocaCubeDrawing = {
  strokes: MocaDrawingStroke[];
};

type MocaCubeCopyTaskProps = {
  strokes: MocaDrawingStroke[];
  onStrokesChange: (strokes: MocaDrawingStroke[]) => void;
  onDrawingActiveChange?: (active: boolean) => void;
};

export function MocaCubeCopyTask({
  strokes,
  onStrokesChange,
  onDrawingActiveChange,
}: MocaCubeCopyTaskProps) {
  function clearDrawing() {
    onStrokesChange([]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>VISUOSPATIAL / EXECUTIVE</Text>
      </View>

      <Text style={[styles.prompt, typography.body]}>
        Copy this cube in the space below exactly as you see it.
      </Text>

      <MocaReferenceCube />

      <Text style={[styles.drawLabel, typography.caption]}>Your drawing</Text>
      <MocaDrawingCanvas
        onDrawingActiveChange={onDrawingActiveChange}
        onStrokesChange={onStrokesChange}
        strokes={strokes}
      />

      <Pressable accessibilityRole="button" onPress={clearDrawing} style={styles.clearLink}>
        <Text style={[styles.clearText, typography.caption]}>Clear drawing</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    marginTop: spacing.xl,
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
  drawLabel: {
    color: colors.textMuted,
    textAlign: "center",
  },
  clearLink: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  clearText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
});

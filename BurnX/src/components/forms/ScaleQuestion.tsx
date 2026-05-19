import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../Card";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  questionText: string;
  labels: string[];
  onPick: (index: number) => void;
  /** Current section title from form definition (optional). */
  sectionTitle?: string;
  /** Section instructions (optional). */
  sectionInstructions?: string;
  /** Visually reinforces the chosen option index (typically `answers[qId]`). */
  selectedOptionIndex?: number | null;
  /** When true, options do not respond (e.g. while submitting). */
  interactionDisabled?: boolean;
};

const ROW_MIN_H = 52;
const INDEX_SZ = 34;

export function ScaleQuestion({
  questionText,
  labels,
  onPick,
  sectionTitle,
  sectionInstructions,
  selectedOptionIndex,
  interactionDisabled = false,
}: Props) {
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

      <View style={styles.options}>
        {labels.map((label, index) => {
          const isLast = index === labels.length - 1;
          const selected =
            selectedOptionIndex !== null &&
            selectedOptionIndex !== undefined &&
            selectedOptionIndex === index;
          return (
            <Pressable
              key={`${label}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`${label}, option ${index + 1} of ${labels.length}`}
              accessibilityState={{ selected, disabled: interactionDisabled }}
              disabled={interactionDisabled}
              style={({ pressed }) => [
                styles.row,
                !isLast && styles.rowDivider,
                selected && styles.rowSelected,
                pressed && !interactionDisabled && styles.rowPressed,
              ]}
              onPress={() => onPick(index)}
            >
              <View style={styles.indexBadge} accessibilityElementsHidden>
                <Text style={[styles.indexText, typography.micro]}>
                  {String(index + 1)}
                </Text>
              </View>
              <Text style={[styles.rowText, typography.body]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
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
  options: {
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: ROW_MIN_H,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowSelected: {
    backgroundColor: colors.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  indexBadge: {
    width: INDEX_SZ,
    height: INDEX_SZ,
    borderRadius: INDEX_SZ / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indexText: {
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  rowText: {
    flex: 1,
    color: colors.text,
  },
});

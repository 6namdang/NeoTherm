import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  /** Label from `buildFormRecallPeriodLabel` — omit chip when empty. */
  label: string;
};

/**
 * Shared recall window callout for Care program questionnaires — matches runner chrome in [formId].tsx.
 */
export function FormRecallPeriodChip({ label }: Props) {
  if (!label.trim()) return null;
  return (
    <View accessibilityRole="text" style={styles.chip}>
      <Text style={[styles.text, typography.caption]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  text: {
    color: colors.textSecondary,
  },
});

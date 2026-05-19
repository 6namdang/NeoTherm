import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type MetricCardProps = {
  label: string;
  value: string;
  footer?: string;
};

export function MetricCard({ label, value, footer }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.label, typography.micro]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        accessibilityRole="text"
        style={[styles.value, typography.headlineMedium]}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
      {footer ? (
        <Text style={[styles.footer, typography.caption]} numberOfLines={2}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 124,
    minWidth: 148,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "flex-start",
    gap: spacing.sm + 2,
  },
  label: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: typography.headlineMedium.fontFamily,
    marginBottom: spacing.xs,
  },
  footer: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs + 2,
  },
});

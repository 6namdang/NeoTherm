import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBackPress?: () => void;
};

export function PageHeader({ title, subtitle, eyebrow, onBackPress }: PageHeaderProps) {
  return (
    <View style={styles.wrapper}>
      {onBackPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBackPress}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      ) : null}
      {eyebrow ? (
        <Text style={[styles.eyebrow, typography.eyebrow]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, typography.headlineMedium]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, typography.body]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg + 2,
    width: "100%",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginBottom: spacing.md,
  },
  backLabel: {
    fontFamily: typography.title.fontFamily,
    color: colors.primary,
    fontSize: 15,
    letterSpacing: -0.08,
    lineHeight: 20,
  },
  eyebrow: {
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 560,
    flexShrink: 1,
  },
});

import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "../../../theme/colors";
import { shadows } from "../../../theme/shadows";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

type ChartShellProps = {
  title?: string;
  description?: string;
  footer?: string;
  children: ReactNode;
  style?: ViewStyle;
};

/** Card shell for charts — mirrors React Native Reusables Card layout using StyleSheet. */
export function ChartShell({
  title,
  description,
  footer,
  children,
  style,
}: ChartShellProps) {
  return (
    <View style={[styles.card, style]}>
      {title || description ? (
        <View style={styles.header}>
          {title ? (
            <Text style={[styles.title, typography.bodyStrong]}>{title}</Text>
          ) : null}
          {description ? (
            <Text style={[styles.description, typography.caption]}>
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? (
        <Text style={[styles.footer, typography.caption]}>{footer}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    gap: 4,
  },
  title: {
    color: colors.text,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    color: colors.textMuted,
    lineHeight: 18,
  },
});

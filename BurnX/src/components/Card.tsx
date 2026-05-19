import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";

type CardVariant = "elevated" | "outline" | "muted";

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
  variant?: CardVariant;
}>;

export function Card({ children, style, variant = "elevated" }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === "elevated" && styles.elevated,
        variant === "outline" && styles.outline,
        variant === "muted" && styles.muted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.divider,
  },
});

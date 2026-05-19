import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  primaryAction?: { title: string; onPress: () => void };
  children?: ReactNode;
};

/** Professional roster / dashboard empty shells — one focal CTA */
export function EmptyState({
  icon = "folder-open-outline",
  title,
  subtitle,
  primaryAction,
  children,
}: EmptyStateProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.title, typography.title]}>{title}</Text>
      <Text style={[styles.subtitle, typography.body]}>{subtitle}</Text>
      {children}
      {primaryAction ? (
        <View style={styles.cta}>
          <Button title={primaryAction.title} onPress={primaryAction.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    paddingVertical: spacing.xxl + spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    gap: spacing.sm + 2,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md + 6,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  cta: {
    width: "100%",
    marginTop: spacing.sm,
  },
});

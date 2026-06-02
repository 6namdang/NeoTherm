import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

export type MocaVoiceMicButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "stop";
};

/** Compact mic control — separate from the status ring. */
export function MocaVoiceMicButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
}: MocaVoiceMicButtonProps) {
  const isStop = variant === "stop";
  const isOutline = variant === "outline";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isStop && styles.stop,
        isOutline && styles.outline,
        !isStop && !isOutline && styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons
        color={
          disabled
            ? colors.textMuted
            : isStop
              ? colors.danger
              : isOutline
                ? colors.primary
                : colors.textOnPrimary
        }
        name={isStop ? "stop-circle-outline" : "mic"}
        size={16}
      />
      <Text
        style={[
          typography.caption,
          styles.label,
          isStop && styles.stopLabel,
          isOutline && styles.outlineLabel,
          !isStop && !isOutline && styles.primaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MocaVoiceMicButtonRow({ children }: PropsWithChildren) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    width: "100%",
  },
  base: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: radius.sm + 2,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  stop: {
    backgroundColor: colors.surface,
    borderColor: colors.dangerSoft,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
  primaryLabel: {
    color: colors.textOnPrimary,
  },
  outlineLabel: {
    color: colors.primary,
  },
  stopLabel: {
    color: colors.danger,
  },
  disabledLabel: {
    color: colors.textMuted,
  },
});

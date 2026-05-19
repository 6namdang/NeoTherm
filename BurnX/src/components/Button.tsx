import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { fontFamily } from "../theme/fontFamily";
import { radius, spacing } from "../theme/spacing";
type ButtonVariant = "primary" | "secondary" | "destructiveOutline" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityHint={variant === "primary" ? "Primary action on this screen" : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        style,
        isPrimary && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "destructiveOutline" && styles.destructiveOutline,
        isGhost && styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.label,
          isPrimary && styles.primaryText,
          variant === "secondary" && styles.secondaryText,
          variant === "destructiveOutline" && styles.destructiveText,
          isGhost && styles.ghostText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    letterSpacing: -0.05,
    lineHeight: 20,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.button,
    borderWidth: 1,
    borderColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  destructiveOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.998 }],
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: colors.textOnPrimary,
  },
  secondaryText: {
    color: colors.accent,
  },
  destructiveText: {
    color: colors.danger,
  },
  ghostText: {
    color: colors.primary,
  },
  disabledText: {
    opacity: 1,
  },
});

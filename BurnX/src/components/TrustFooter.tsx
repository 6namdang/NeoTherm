import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type TrustFooterProps = {
  message?: string;
  dense?: boolean;
};

/** Short privacy reassurance */
export function TrustFooter({
  dense,
  message = "Protected health information is handled under HIPAA and hospital agreements. Some actions may be logged for security.",
}: TrustFooterProps) {
  return (
    <View style={[styles.shell, dense && styles.shellDense]}>
      <Ionicons
        name="shield-checkmark-outline"
        size={dense ? 16 : 18}
        color={colors.primary}
      />
      <Text style={[styles.text, typography.caption]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "100%",
  },
  shellDense: {
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

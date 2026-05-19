import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type AssistiveClinicalNoticeProps = {
  confidenceLabel?: string;
  helperText?: string;
};

/** Brief note that reminders and prompts do not replace a clinician */
export function AssistiveClinicalNotice({
  confidenceLabel = "Your clinical team decides care",
  helperText = "BurnX only shows reminders your hospital turns on - it never replaces doctors or nurses.",
}: AssistiveClinicalNoticeProps) {
  return (
    <View style={styles.shell}>
      <Ionicons name="pulse-outline" size={18} color={colors.primary} />
      <View style={styles.copy}>
        <Text style={[styles.title, typography.micro]}>{confidenceLabel}</Text>
        <Text style={[styles.body, typography.caption]}>{helperText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  title: {
    color: colors.primary,
    marginBottom: spacing.sm + 2,
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  copy: {
    flex: 1,
    paddingTop: 1,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CareProgramHomeRow } from "./DashboardBottomSections";
import { careProgramFormHref } from "../lib/care-program-form-groups";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = {
  readonly rows: readonly CareProgramHomeRow[];
};

const ICON_FOR_FORM: Record<string, keyof typeof Ionicons.glyphMap> = {
  ema_sleep_quality_v1: "moon-outline",
  ema_pain_now_v1: "pulse-outline",
  ema_mood_v1: "happy-outline",
  pain_intensity_v1: "pulse-outline",
  pain_inference_v1: "bandage-outline",
  libre_v1: "clipboard-outline",
  psqi_v1: "moon-outline",
  cognitive_function_v1: "bulb-outline",
  fatigue_v1: "battery-half-outline",
  gad7_v1: "alert-circle-outline",
  long_assessment_v1: "layers-outline",
};

/** Home Overview — due-now tasks in a restrained enterprise card. */
export function DashboardOverviewSection({ rows }: Props) {
  const dueCount = rows.length;

  return (
    <View style={styles.wrap} accessibilityRole="none">
      <Text style={[styles.sectionTitle, typography.eyebrow]}>Overview</Text>

      <View style={styles.groupBox}>
        <View style={styles.notFinishedRow}>
          <Text style={styles.notFinishedLabel}>Not finished:</Text>
          {dueCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{dueCount} due</Text>
            </View>
          ) : null}
        </View>

        {dueCount === 0 ? (
          <Text style={[styles.empty, typography.caption]}>
            Nothing due right now.
          </Text>
        ) : (
          <View style={styles.list}>
            {rows.map((row, index) => (
              <Pressable
                accessibilityLabel={`Open ${row.title}`}
                accessibilityRole="button"
                key={row.id}
                onPress={() => router.push(careProgramFormHref(row.id))}
                style={({ pressed }) => [
                  styles.itemPress,
                  index > 0 && styles.itemDivider,
                  pressed && styles.itemPressed,
                ]}
              >
                <Ionicons
                  color={colors.primary}
                  name={ICON_FOR_FORM[row.id] ?? "document-text-outline"}
                  size={18}
                />
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {row.title}
                </Text>
                <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl + spacing.sm,
    gap: spacing.sm + 2,
    width: "100%",
    alignSelf: "stretch",
  },
  sectionTitle: {
    color: colors.textMuted,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  groupBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  notFinishedRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notFinishedLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  countBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  countBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  empty: {
    color: colors.textMuted,
    lineHeight: 20,
    paddingBottom: spacing.xs,
  },
  list: {
    width: "100%",
  },
  itemPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 3,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  itemPressed: {
    backgroundColor: colors.overlay,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
});

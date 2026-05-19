import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CareProgramHomeRow } from "./DashboardBottomSections";
import { Card } from "./Card";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = {
  readonly rows: readonly CareProgramHomeRow[];
};

/** Home tab: outstanding EMA questionnaires (window + completion from server). */
export function EmaHomeSection({ rows }: Props) {
  if (rows.length === 0) return null;

  const iconFor: Record<string, keyof typeof Ionicons.glyphMap> = {
    ema_sleep_quality_v1: "moon-outline",
    ema_pain_now_v1: "pulse-outline",
    ema_mood_v1: "happy-outline",
  };

  return (
    <View style={styles.wrap} accessibilityRole="none">
      <Text style={[styles.kicker, typography.eyebrow]}>Daily check-ins</Text>
      <Text style={[styles.lede, typography.body]}>
        {"Short questionnaires open during today's morning and evening windows."}
      </Text>
      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable
            accessibilityLabel={`Open ${row.title}`}
            accessibilityRole="button"
            key={row.id}
            onPress={() => router.push(`/forms/${row.id}` as Href)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card variant="outline" style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    color={colors.primary}
                    name={iconFor[row.id] ?? "notifications-outline"}
                    size={22}
                  />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.title, typography.title]}>{row.title}</Text>
                  <Text style={[styles.meta, typography.micro]}>Due now</Text>
                </View>
                <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl + spacing.sm,
    gap: spacing.md,
  },
  kicker: {
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  lede: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    marginBottom: 2,
  },
  meta: {
    color: colors.accentMuted,
    letterSpacing: 0.35,
  },
});

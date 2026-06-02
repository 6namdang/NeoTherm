import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../theme/colors";
import { shadows } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { AnimatedSparkline } from "../charts/ui/AnimatedSparkline";

type AppleHealthMetricCardProps = {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  unit?: string;
  footnote: string;
  onPress?: () => void;
  sparklineValues?: number[];
};

export function AppleHealthMetricCard({
  accent,
  icon,
  label,
  value,
  unit,
  footnote,
  onPress,
  sparklineValues,
}: AppleHealthMetricCardProps) {
  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${accent}22` }]}>
          <Ionicons color={accent} name={icon} size={20} />
        </View>
        <Text style={[styles.label, typography.micro]}>{label}</Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {sparklineValues && sparklineValues.length >= 2 ? (
        <AnimatedSparkline color={accent} values={sparklineValues} />
      ) : (
        <View style={[styles.accentLine, { backgroundColor: accent }]} />
      )}

      <Text style={[styles.footnote, typography.caption]}>{footnote}</Text>
    </>
  );

  const cardStyle = [
    styles.card,
    { borderColor: `${accent}33`, backgroundColor: `${accent}08` },
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.88 }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 148,
    minHeight: 176,
    borderRadius: 26,
    borderWidth: 1,
    padding: spacing.lg + 2,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  value: {
    ...typography.headlineLarge,
    color: colors.text,
    letterSpacing: -0.8,
  },
  unit: {
    ...typography.caption,
    color: colors.textMuted,
    paddingBottom: 4,
  },
  accentLine: {
    height: 3,
    width: 36,
    borderRadius: 999,
  },
  footnote: {
    color: colors.textSecondary,
    lineHeight: 19,
  },
});

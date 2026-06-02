import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

type ChartLegendItemProps = {
  color: string;
  label: string;
  value: string;
};

export function ChartLegendItem({ color, label, value }: ChartLegendItemProps) {
  return (
    <View style={styles.item}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <View style={styles.copy}>
        <Text style={[styles.label, typography.caption]}>{label}</Text>
        <Text style={[styles.value, typography.bodyStrong]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 14,
    backgroundColor: colors.systemGray6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    color: colors.textMuted,
  },
  value: {
    color: colors.text,
  },
});

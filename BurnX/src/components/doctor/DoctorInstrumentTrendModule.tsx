import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScoreTimelineRow } from "../../lib/doctor-patient-scoreboard";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  row: ScoreTimelineRow;
  onOpenDetail: () => void;
};

/** One instrument’s timeline: dates and values are aligned **per instrument** only. */
export function DoctorInstrumentTrendModule({ row, onOpenDetail }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={[styles.title, typography.bodyStrong]} numberOfLines={2}>
          {row.title}
        </Text>
        <Pressable
          accessibilityLabel={`View responses and scores for ${row.title}`}
          hitSlop={8}
          onPress={onOpenDetail}
          style={({ pressed }) => [styles.detailBtn, pressed && styles.detailBtnPressed]}
        >
          <Text style={[styles.detailBtnText, typography.caption]}>Responses</Text>
          <Ionicons color={colors.primary} name="open-outline" size={18} />
        </Pressable>
      </View>
      <Text style={[styles.hint, typography.micro]}>
        Older → newer · Dates are for this instrument only (visits differ by programme)
      </Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollInner}
        nestedScrollEnabled
        showsHorizontalScrollIndicator
      >
        {row.cells.map((cell) => (
          <View key={`${row.formId}-${cell.createdAtIso}`} style={styles.col}>
            <Text style={[styles.dateLab, typography.micro]} numberOfLines={1}>
              {cell.dateShort}
            </Text>
            <View style={styles.valBox}>
              <Text style={[styles.valTxt, typography.bodyStrong]}>{cell.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const COL_MIN = 52;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  detailBtnPressed: {
    opacity: 0.85,
  },
  detailBtnText: {
    color: colors.primary,
    fontWeight: "700",
  },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  scrollInner: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: 2,
  },
  col: {
    minWidth: COL_MIN,
    alignItems: "center",
  },
  dateLab: {
    color: colors.textMuted,
    marginBottom: 6,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  valBox: {
    minWidth: COL_MIN,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  valTxt: {
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
});

import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { TrustFooter } from "./TrustFooter";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export type CareProgramHomeRow = {
  id: string;
  title: string;
  pending: boolean;
};

const ICON_FOR_FORM: Record<string, keyof typeof Ionicons.glyphMap> = {
  pain_intensity_v1: "pulse-outline",
  pain_inference_v1: "bandage-outline",
  libre_v1: "clipboard-outline",
  psqi_v1: "moon-outline",
  cognitive_function_v1: "bulb-outline",
  fatigue_v1: "battery-half-outline",
  gad7_v1: "alert-circle-outline",
};

type DashboardBottomSectionsProps = {
  careProgramRows: CareProgramHomeRow[];
};

/**
 * Home dashboard tail — care program status, navigation to assignments, trust copy (TONE: calm, operational).
 */
export function DashboardBottomSections({
  careProgramRows,
}: DashboardBottomSectionsProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, typography.title]}>Care programs</Text>
        <Text style={[styles.sectionHint, typography.caption]}>
          Status of each questionnaire your team may assign. Tap a row to open it, or use Assignments for the full list.
        </Text>
      </View>

      <Card variant="outline" style={styles.programsCard}>
        <View style={styles.programsList}>
          {careProgramRows.map((row, index) => (
            <CareProgramRow
              isFirst={index === 0}
              key={row.id}
              row={row}
            />
          ))}
        </View>
      </Card>

      <View style={styles.quickBlock}>
        <Text style={[styles.quickTitle, typography.eyebrow]}>Quick links</Text>
        <View style={styles.quickRow}>
          <Button
            title="Care programs"
            variant="secondary"
            onPress={() => router.push("/forms" as Href)}
          />
          <Button
            title="Profile & security"
            variant="ghost"
            onPress={() => router.push("/profile" as Href)}
          />
        </View>
      </View>

      <TrustFooter
        dense
        message="Questionnaire data syncs over encrypted connections to systems your hospital approves. Pull down on this screen to refresh."
      />
    </View>
  );
}

function CareProgramRow({
  row,
  isFirst,
}: {
  row: CareProgramHomeRow;
  isFirst: boolean;
}) {
  const icon = ICON_FOR_FORM[row.id] ?? "document-text-outline";
  return (
    <Pressable
      accessibilityHint={row.pending ? "Questionnaire may be due" : "Recently on record"}
      accessibilityLabel={`${row.title}, ${row.pending ? "needs completion" : "complete"}`}
      accessibilityRole="button"
      onPress={() => router.push(`/forms/${row.id}` as Href)}
      style={({ pressed }) => [
        styles.rowPress,
        !isFirst && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons color={colors.primary} name={icon} size={20} />
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={2} style={[styles.rowTitle, typography.subtitle]}>
          {row.title}
        </Text>
        <Text style={[styles.rowMeta, typography.caption]}>
          {row.pending ? "May be due under your assignment schedule" : "Latest response on record"}
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          row.pending ? styles.statusPillDue : styles.statusPillOk,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            typography.micro,
            row.pending ? styles.statusTextDue : styles.statusTextOk,
          ]}
        >
          {row.pending ? "Needs completion" : "Complete"}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md + 4,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  sectionHead: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionHint: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  programsCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  programsList: {
    gap: 0,
  },
  rowPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  rowMeta: {
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    maxWidth: 140,
  },
  statusPillDue: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.border,
  },
  statusPillOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.border,
  },
  statusText: {
    textAlign: "center",
    letterSpacing: 0.35,
  },
  statusTextDue: {
    color: colors.warning,
    fontWeight: "600",
  },
  statusTextOk: {
    color: colors.success,
    fontWeight: "600",
  },
  quickBlock: {
    gap: spacing.sm + 2,
  },
  quickTitle: {
    color: colors.textMuted,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});

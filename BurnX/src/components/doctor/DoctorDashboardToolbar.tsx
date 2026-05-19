import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type {
  PatientFilterMode,
  PatientSortMode,
  RosterSummary,
} from "../../lib/doctor-roster-insights";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type Props = {
  summary: RosterSummary;
  search: string;
  onSearchChange: (q: string) => void;
  sortMode: PatientSortMode;
  onSortChange: (m: PatientSortMode) => void;
  filterMode: PatientFilterMode;
  onFilterChange: (m: PatientFilterMode) => void;
  lastSyncedLabel: string | null;
};

const SORT_OPTIONS: { id: PatientSortMode; label: string }[] = [
  { id: "activity", label: "Recent activity" },
  { id: "name", label: "Name A–Z" },
  { id: "injury", label: "Injury date" },
];

const FILTER_OPTIONS: { id: PatientFilterMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active7", label: "Active (7d)" },
  { id: "followup", label: "Follow-up" },
];

export function DoctorRosterToolbar({
  summary,
  search,
  onSearchChange,
  sortMode,
  onSortChange,
  filterMode,
  onFilterChange,
  lastSyncedLabel,
}: Props) {
  return (
    <View style={styles.wrap}>
      {lastSyncedLabel ? (
        <Text style={[styles.syncLine, typography.micro]}>{lastSyncedLabel}</Text>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons
          color={colors.textMuted}
          name="search"
          size={20}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityLabel="Search patients by name"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onSearchChange}
          placeholder="Search by name"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, typography.body]}
          value={search}
        />
        {search.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear search"
            hitSlop={10}
            onPress={() => onSearchChange("")}
            style={styles.clearBtn}
          >
            <Ionicons color={colors.textMuted} name="close-circle" size={22} />
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.sectionLabel, typography.caption]}>Sort by</Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.chipsRow}
        showsHorizontalScrollIndicator={false}
      >
        {SORT_OPTIONS.map((o) => {
          const on = sortMode === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityState={{ selected: on }}
              onPress={() => onSortChange(o.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, typography.caption, on && styles.chipTextOn]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, typography.caption]}>Show</Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.chipsRow}
        showsHorizontalScrollIndicator={false}
      >
        {FILTER_OPTIONS.map((o) => {
          const on = filterMode === o.id;
          const countHint =
            o.id === "all"
              ? summary.total
              : o.id === "active7"
                ? summary.activeLast7d
                : summary.needsFollowUp;
          return (
            <Pressable
              key={o.id}
              accessibilityState={{ selected: on }}
              onPress={() => onFilterChange(o.id)}
              style={[styles.chip, on && styles.chipOnStrong]}
            >
              <Text style={[styles.chipText, typography.caption, on && styles.chipTextOn]}>
                {o.label}
              </Text>
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, typography.micro]}>{countHint}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DoctorKpiStrip({ summary }: { summary: RosterSummary }) {
  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; hint: string }[] =
    [
      {
        icon: "people",
        label: "On roster",
        value: String(summary.total),
        hint: "Patients linked to your hospital",
      },
      {
        icon: "pulse",
        label: "Active (7d)",
        value: String(summary.activeLast7d),
        hint: "Any questionnaire in the last week",
      },
      {
        icon: "alert-circle-outline",
        label: "Follow-up",
        value: String(summary.needsFollowUp),
        hint: "No activity in 14+ days or never",
      },
      {
        icon: "person-add-outline",
        label: "New (30d)",
        value: String(summary.newEnrolled30d),
        hint: "Accounts created in the last month",
      },
    ];

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.kpiScroll}
      showsHorizontalScrollIndicator={false}
    >
      {items.map((it) => (
        <View key={it.label} style={styles.kpiCard}>
          <View style={styles.kpiIconWrap}>
            <Ionicons color={colors.primary} name={it.icon} size={22} />
          </View>
          <Text style={[styles.kpiValue, typography.headlineMedium]}>{it.value}</Text>
          <Text style={[styles.kpiLabel, typography.caption]}>{it.label}</Text>
          <Text style={[styles.kpiHint, typography.micro]} numberOfLines={2}>
            {it.hint}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const KPI_W = 148;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  syncLine: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  clearBtn: {
    marginLeft: spacing.xs,
  },
  sectionLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.sm,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipOnStrong: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  chipTextOn: {
    color: colors.primary,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
  },
  badgeOn: {
    backgroundColor: colors.surface,
  },
  badgeText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  kpiScroll: {
    gap: spacing.md,
    paddingVertical: 2,
    paddingBottom: spacing.sm,
  },
  kpiCard: {
    width: KPI_W,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kpiIconWrap: {
    marginBottom: spacing.sm,
  },
  kpiValue: {
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  kpiHint: {
    color: colors.textMuted,
    lineHeight: 16,
  },
});

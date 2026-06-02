import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, DeviceEventEmitter, StyleSheet, Text, View } from "react-native";

import {
  AnimatedSleepWeekBars,
  SLEEP_CHART_DAYS,
} from "../charts/ui/AnimatedSleepWeekBars";
import {
  getSleepSummaries,
  latestSleepSummaries,
  type SleepDailySummary,
} from "../../lib/sleep-storage";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export function SleepEstimateInlineCard() {
  const [summaries, setSummaries] = useState<SleepDailySummary[]>([]);

  const refresh = useCallback(async () => {
    setSummaries(await getSleepSummaries());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("burnx-sleep-refresh", () => {
      void refresh();
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refresh();
      }
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  const chartDays = useMemo(
    () => latestSleepSummaries(summaries, SLEEP_CHART_DAYS),
    [summaries],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons color={colors.primary} name="moon-outline" size={16} />
          <Text style={styles.badgeText}>Estimated sleep</Text>
        </View>
      </View>

      <AnimatedSleepWeekBars days={chartDays} />

      <Text style={styles.footnote}>
        Estimated from phone lock time at home after 7 PM, verified by low movement.
        Not a clinical sleep study.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "100%",
    minWidth: 280,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.micro,
    color: colors.primary,
    textTransform: "uppercase",
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

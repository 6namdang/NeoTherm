import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatDuration,
  HOME_AWAY_CHART_DAYS,
  latestSummaries,
} from "../../lib/home-location-accumulator";
import type { HomeAwayDailySummary } from "../../lib/home-location-types";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "../Button";
import { ChartShell } from "../charts/ui/ChartShell";
import { AnimatedWeekBars } from "../charts/ui/AnimatedWeekBars";

type Props = {
  visible: boolean;
  enabled: boolean;
  hasLocalSetup: boolean;
  hasConsent: boolean;
  serviceAvailable: boolean;
  summaries: HomeAwayDailySummary[];
  today: HomeAwayDailySummary;
  permissionLabel: string;
  onClose: () => void;
  onOpenSettings: () => void;
  onSetup: () => void;
  onRefresh: () => void;
  onClearHistory: () => void;
};

export function HomeAwayDetailModal({
  visible,
  hasLocalSetup,
  hasConsent,
  serviceAvailable,
  summaries,
  today,
  permissionLabel,
  onClose,
  onOpenSettings,
  onSetup,
  onRefresh,
  onClearHistory,
}: Props) {
  const insets = useSafeAreaInsets();
  const chartDays = useMemo(
    () => latestSummaries(summaries, HOME_AWAY_CHART_DAYS),
    [summaries],
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          {
            paddingTop: Platform.OS === "ios" ? insets.top + spacing.md : spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, typography.micro]}>Home/Away</Text>
              <Text style={[styles.title, typography.headlineMedium]}>
                Daily estimates
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close home away details"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={26} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.statusCard}>
              <Text style={[styles.statusLabel, typography.micro]}>Status</Text>
              <Text style={[styles.statusValue, typography.bodyStrong]}>
                {serviceAvailable
                  ? "Enabled"
                  : hasLocalSetup
                    ? "Service not available"
                    : hasConsent
                      ? "Set up this iPhone"
                      : "Consent needed"}
              </Text>
              <Text style={[styles.permission, typography.caption]}>
                {permissionLabel}
              </Text>
            </View>

            {!serviceAvailable ? (
              <View style={styles.unavailableCard}>
                <Ionicons color={colors.warning} name="warning-outline" size={22} />
                <Text style={[styles.unavailableCopy, typography.caption]}>
                  Service not available. Please allow Location access for NeoTherm
                  so iOS can detect when the phone enters or leaves the home
                  boundary.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.metricRow}>
                  <Metric label="At home today" value={formatDuration(today.homeMinutes)} />
                  <Metric label="Outside today" value={formatDuration(today.outsideMinutes)} />
                </View>

                <ChartShell
                  description="Blue is home time and orange is away time for each day."
                  style={styles.weekChart}
                  title="Last 7 days"
                >
                  <AnimatedWeekBars days={chartDays} />
                </ChartShell>
              </>
            )}

            <View style={styles.statement}>
              <Ionicons color={colors.primary} name="lock-closed-outline" size={19} />
              <Text style={[styles.statementText, typography.caption]}>
                NeoTherm does not store route history, maps, pins, or repeated GPS
                trails for this feature. Clear history removes local home/away
                summaries and the stored home boundary from this device.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {hasLocalSetup && !serviceAvailable ? (
              <Button
                title="Allow Location in Settings"
                onPress={onOpenSettings}
              />
            ) : null}
            {!hasLocalSetup ? (
              <Button
                title={hasConsent ? "Set Up This iPhone" : "Open Setup"}
                onPress={onSetup}
              />
            ) : null}
            <Button
              disabled={!serviceAvailable}
              title="Refresh Estimate"
              variant="secondary"
              onPress={onRefresh}
            />
            <Button
              title="Clear History"
              variant="destructiveOutline"
              onPress={onClearHistory}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, typography.micro]}>{label}</Text>
      <Text style={[styles.metricValue, typography.title]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  eyebrow: {
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  statusValue: {
    color: colors.text,
  },
  permission: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metric: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.text,
  },
  weekChart: {
    marginBottom: spacing.lg,
  },
  statement: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  statementText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unavailableCard: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  unavailableCopy: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});

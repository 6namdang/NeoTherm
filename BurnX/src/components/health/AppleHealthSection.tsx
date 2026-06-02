import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  DeviceEventEmitter,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  loadAppleHealthDashboardSummary,
  requestAppleHealthAccess,
  type AppleHealthDashboardSummary,
} from "../../lib/healthkit";
import { getHomeAwaySnapshot } from "../../lib/home-location-storage";
import { getSleepMotionPermissionGranted } from "../../lib/sleep-tracker";
import { colors } from "../../theme/colors";
import { shadows } from "../../theme/shadows";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { AppleHealthMetricCard } from "./AppleHealthMetricCard";
import { AppleHealthFlightsModal } from "./AppleHealthFlightsModal";
import { AppleHealthStepsModal } from "./AppleHealthStepsModal";
import { HomeAwayDashboardCard } from "../location/HomeAwayDashboardCard";
import { SleepEstimateInlineCard } from "./SleepEstimateInlineCard";

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function AppleHealthSection() {
  const [summary, setSummary] = useState<AppleHealthDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [flightsOpen, setFlightsOpen] = useState(false);
  const [sleepReady, setSleepReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await loadAppleHealthDashboardSummary());
    } catch {
      setSummary({
        available: Platform.OS === "ios",
        authorized: false,
        steps: null,
        stepsHistory: [],
        flights: null,
        flightsHistory: [],
      });
      setError("Apple Health permission is needed to show steps.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSleepReady = useCallback(async () => {
    if (Platform.OS !== "ios") {
      setSleepReady(false);
      return;
    }
    const [snapshot, motionGranted] = await Promise.all([
      getHomeAwaySnapshot(),
      getSleepMotionPermissionGranted(),
    ]);
    setSleepReady(snapshot.config != null && motionGranted);
  }, []);

  useEffect(() => {
    void load();
    void refreshSleepReady();
  }, [load, refreshSleepReady]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refreshSleepReady();
      }
    });
    return () => {
      sub.remove();
    };
  }, [refreshSleepReady]);

  useEffect(() => {
    const refresh = () => {
      void refreshSleepReady();
    };
    const homeSub = DeviceEventEmitter.addListener("burnx-home-away-refresh", refresh);
    const sleepSub = DeviceEventEmitter.addListener("burnx-sleep-refresh", refresh);
    return () => {
      homeSub.remove();
      sleepSub.remove();
    };
  }, [refreshSleepReady]);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await requestAppleHealthAccess();
      if (!ok) {
        setError("Apple Health access was not granted.");
      }
      await load();
    } catch {
      setError("Apple Health access was not granted.");
    } finally {
      setLoading(false);
    }
  };

  const unavailable = summary?.available === false || Platform.OS !== "ios";
  const permissionNeeded = unavailable || summary?.authorized === false || error;
  const steps = summary?.steps?.steps ?? 0;
  const averageFlights = summary?.flights?.averageDailyFlights ?? 0;
  const stepsSparkline = (summary?.stepsHistory ?? []).map((point) => point.steps);
  const flightsSparkline = (summary?.flightsHistory ?? []).map((point) => point.flights);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, typography.micro]}>Daily context</Text>
          <View style={styles.titleRow}>
            <View style={styles.healthBadge}>
              <Ionicons color={colors.systemRed} name="heart" size={17} />
            </View>
            <Text style={[styles.title, typography.headlineMedium]}>
              Health Context
            </Text>
          </View>
          <Text style={[styles.subtitle, typography.caption]}>
            Movement, estimated sleep, and home time in one place.
          </Text>
        </View>
      </View>

      {permissionNeeded ? (
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            {loading ? (
              <ActivityIndicator color={colors.systemRed} size="small" />
            ) : (
              <Ionicons color={colors.systemRed} name="heart-outline" size={24} />
            )}
          </View>
          <View style={styles.permissionCopy}>
            <Text style={[styles.permissionTitle, typography.bodyStrong]}>
              {unavailable ? "Apple Health unavailable" : "Connect Apple Health"}
            </Text>
            <Text style={[styles.permissionText, typography.caption]}>
              {unavailable
                ? "HealthKit is available only on iPhone native builds."
                : "NeoTherm reads steps and flights locally from Apple Health. Data is not sent to the backend in this version."}
            </Text>
          </View>
          {!unavailable ? (
            <Pressable
              accessibilityLabel="Connect Apple Health"
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void connect()}
              style={({ pressed }) => [
                styles.connectButton,
                pressed && { opacity: 0.82 },
                loading && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.connectText}>Connect</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.cards}>
          <AppleHealthMetricCard
            accent={colors.systemGreen}
            footnote="Read locally from Apple Health for today."
            icon="footsteps-outline"
            label="Steps Today"
            onPress={() => setStepsOpen(true)}
            sparklineValues={stepsSparkline}
            unit="steps"
            value={formatInteger(steps)}
          />
          <AppleHealthMetricCard
            accent={colors.systemOrange}
            footnote="7-day daily average from Apple Health."
            icon="trending-up-outline"
            label="Flights Climbed"
            onPress={() => setFlightsOpen(true)}
            sparklineValues={flightsSparkline}
            unit="avg/day"
            value={formatInteger(averageFlights)}
          />
        </View>
      )}

      {sleepReady ? <SleepEstimateInlineCard /> : null}

      <HomeAwayDashboardCard />
      <AppleHealthStepsModal
        history={summary?.stepsHistory ?? []}
        visible={stepsOpen}
        onClose={() => setStepsOpen(false)}
      />
      <AppleHealthFlightsModal
        history={summary?.flightsHistory ?? []}
        visible={flightsOpen}
        onClose={() => setFlightsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    marginBottom: spacing.xxl,
    gap: spacing.lg,
    borderRadius: 34,
    backgroundColor: colors.systemGray6,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xs,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  healthBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  permissionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionCopy: {
    flex: 1,
    minWidth: 0,
  },
  permissionTitle: {
    color: colors.text,
  },
  permissionText: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 2,
  },
  connectButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.systemRed,
    alignItems: "center",
    justifyContent: "center",
  },
  connectText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});

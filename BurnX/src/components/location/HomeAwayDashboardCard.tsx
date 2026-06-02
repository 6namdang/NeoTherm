import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  DeviceEventEmitter,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { latestSummaries, localDateKey } from "../../lib/home-location-accumulator";
import { getHomeAwaySnapshot } from "../../lib/home-location-storage";
import {
  getHomeAwayPermissionSnapshot,
  hasHomeAwayLocationPermission,
  ensureHomeAwayTrackingRegistered,
  primeHomeAwayLocationPermissions,
  refreshHomeAwayStateFromCurrentLocation,
  stopHomeAwayTracking,
  type HomeAwayPermissionSnapshot,
} from "../../lib/home-location-tracking";
import { hasHomeLocationConsent } from "../../lib/home-location-consent";
import type { HomeAwayDailySummary, HomeAwaySnapshot } from "../../lib/home-location-types";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { HomeAwayDetailModal } from "./HomeAwayDetailModal";
import { AnimatedSplitBar } from "../charts/ui/AnimatedSplitBar";
import { useToast } from "../ToastProvider";

function permissionLabel(permissions: HomeAwayPermissionSnapshot | null): string {
  if (!permissions) return "Checking permissions";
  if (permissions.foreground === "unavailable") return "Native build required";
  if (!permissions.servicesEnabled) return "Location Services off";
  if (permissions.foreground !== "granted") return "Location permission not granted";
  if (permissions.background !== "granted") return "Always permission needed";
  return "Ready for background estimates";
}

function completeToday(snapshot: HomeAwaySnapshot | null): HomeAwayDailySummary {
  const today = localDateKey(new Date());
  const summary = latestSummaries(snapshot?.summaries ?? [], 1)[0];

  return {
    date: summary?.date ?? today,
    homeMinutes: summary?.homeMinutes ?? 0,
    outsideMinutes: summary?.outsideMinutes ?? 0,
    lastUpdatedAt: summary?.lastUpdatedAt ?? null,
  };
}

export function HomeAwayDashboardCard() {
  const { showToast } = useToast();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [snapshot, setSnapshot] = useState<HomeAwaySnapshot | null>(null);
  const [permissions, setPermissions] =
    useState<HomeAwayPermissionSnapshot | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSnapshot, nextPermissions, nextConsented] = await Promise.all([
      getHomeAwaySnapshot(),
      getHomeAwayPermissionSnapshot(),
      hasHomeLocationConsent().catch(() => null),
    ]);
    setSnapshot(nextSnapshot);
    setPermissions(nextPermissions);
    setConsented(nextConsented);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        next === "active" &&
        (prev === "inactive" || prev === "background")
      ) {
        void ensureHomeAwayTrackingRegistered();
        void refresh();
      }
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("burnx-home-away-refresh", () => {
      void ensureHomeAwayTrackingRegistered();
      void refresh();
    });
    return () => {
      sub.remove();
    };
  }, [refresh]);

  const today = useMemo(() => completeToday(snapshot), [snapshot]);
  const hasLocalSetup = snapshot?.config != null;
  const serviceAvailable =
    hasLocalSetup && hasHomeAwayLocationPermission(permissions);
  const status = serviceAvailable
    ? "Enabled"
    : snapshot?.config
      ? "Permission needed"
      : consented
        ? "Set up this iPhone"
        : "Consent needed";

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (caught) {
      Alert.alert(
        "Home/Away tracking",
        caught instanceof Error
          ? caught.message
          : "Home/away tracking could not complete that action.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clearHistory() {
    void runAction(async () => {
      await stopHomeAwayTracking();
      setDetailsOpen(false);
      showToast("Home/Away history cleared from this device.", "success");
    });
  }

  function openSetup() {
    DeviceEventEmitter.emit("burnx-home-away-open-setup");
    setDetailsOpen(false);
  }

  async function openLocationSettings() {
    try {
      await primeHomeAwayLocationPermissions();
      await Linking.openSettings();
    } catch {
      Alert.alert(
        "Open Settings",
        "Open iPhone Settings, choose NeoTherm, then allow Location access.",
      );
    }
  }

  return (
    <>
      <Pressable
        accessibilityHint="Opens home away tracking details"
        accessibilityLabel="Home away tracking card"
        accessibilityRole="button"
        onPress={() => setDetailsOpen(true)}
        style={({ pressed }) => [
          styles.card,
          pressed && Platform.OS === "ios" && { opacity: 0.94 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Home / Away</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View style={styles.statusPill}>
            {busy ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.statusText}>{status}</Text>
            )}
          </View>
        </View>

        {!serviceAvailable ? (
          <View style={styles.serviceUnavailable}>
            <Ionicons color={colors.warning} name="location-outline" size={22} />
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceTitle}>Setup needed</Text>
              <Text style={styles.serviceText}>
                Set your home address and allow Always location access to show today’s split.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.chartWrap}>
            <View style={styles.chartBadge}>
              <Ionicons color={colors.primary} name="home-outline" size={16} />
              <Text style={styles.chartBadgeText}>Live split</Text>
            </View>
            <AnimatedSplitBar
              animateKey={today.date}
              caption="Tracked time today only."
              homeMinutes={today.homeMinutes}
              outsideMinutes={today.outsideMinutes}
            />
            <View style={styles.chevronRow}>
              <Text style={styles.viewHistory}>View 7-day history</Text>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
            </View>
          </View>
        )}

        {!serviceAvailable ? (
          <Pressable
            accessibilityLabel="Allow location for home away tracking"
            accessibilityRole="button"
            onPress={() => {
              if (snapshot?.config) {
                void openLocationSettings();
              } else {
                openSetup();
              }
            }}
            style={({ pressed }) => [
              styles.allowButton,
              pressed && { opacity: 0.82 },
            ]}
          >
            <Text style={styles.allowButtonText}>
              {snapshot?.config ? "Allow Location" : "Set Up This iPhone"}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.footer}>
          Today only. Tap for the last 7 days.
        </Text>
      </Pressable>

      <HomeAwayDetailModal
        enabled={serviceAvailable}
        hasLocalSetup={hasLocalSetup}
        hasConsent={consented === true}
        serviceAvailable={serviceAvailable}
        permissionLabel={permissionLabel(permissions)}
        summaries={snapshot?.summaries ?? []}
        today={today}
        visible={detailsOpen}
        onClearHistory={clearHistory}
        onClose={() => setDetailsOpen(false)}
        onOpenSettings={() => void openLocationSettings()}
        onSetup={openSetup}
        onRefresh={() =>
          void runAction(async () => {
            await refreshHomeAwayStateFromCurrentLocation();
          })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    backgroundColor: colors.chartCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xxl + spacing.sm,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  kicker: {
    ...typography.micro,
    color: colors.chartCardTitle,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: "center",
  },
  statusText: {
    ...typography.micro,
    color: colors.primary,
    textTransform: "uppercase",
  },
  chartWrap: {
    marginTop: spacing.xs,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.systemGray6,
    padding: spacing.md,
  },
  chartBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chartBadgeText: {
    ...typography.micro,
    color: colors.primary,
    textTransform: "uppercase",
  },
  chevronRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  viewHistory: {
    ...typography.caption,
    color: colors.textMuted,
  },
  serviceUnavailable: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    ...typography.bodyStrong,
    color: colors.warning,
    marginBottom: 2,
  },
  serviceText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  allowButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  allowButtonText: {
    ...typography.bodyStrong,
    color: colors.warning,
  },
  footer: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

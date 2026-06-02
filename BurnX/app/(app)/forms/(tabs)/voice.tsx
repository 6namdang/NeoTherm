import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Card } from "../../../../src/components/Card";
import { EmptyState } from "../../../../src/components/EmptyState";
import { PageHeader } from "../../../../src/components/PageHeader";
import { Screen } from "../../../../src/components/Screen";
import { VOICE_CHECKIN_FORM } from "../../../../src/constants/forms/voice-checkin";
import {
  getVoicePendingCache,
  setVoicePendingCache,
} from "../../../../src/lib/assignments-list-cache";
import { resolveVoiceAssignmentPending } from "../../../../src/lib/voice-checkin-eligibility";
import { colors } from "../../../../src/theme/colors";
import { radius, spacing } from "../../../../src/theme/spacing";
import { typography } from "../../../../src/theme/typography";

export default function VoiceAssignmentsTab() {
  const [pending, setPending] = useState<boolean | null>(
    () => getVoicePendingCache() ?? null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const loadPending = useCallback(async () => {
    try {
      const next = await resolveVoiceAssignmentPending(Date.now());
      setVoicePendingCache(next);
      return next;
    } catch {
      setVoicePendingCache(true);
      return true;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPending(await loadPending());
    } finally {
      setRefreshing(false);
    }
  }, [loadPending]);

  useEffect(() => {
    if (getVoicePendingCache() !== undefined) return;

    let cancelled = false;
    (async () => {
      const next = await loadPending();
      if (!cancelled) setPending(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadPending]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const isPending = await loadPending();
        if (!cancelled) setPending(isPending);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadPending]),
  );

  useEffect(() => {
    let mounted = true;
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prev === "inactive" || prev === "background") &&
        nextState === "active"
      ) {
        loadPending().then((isPending) => {
          if (mounted) setPending(isPending);
        });
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [loadPending]);

  return (
    <Screen
      preset="materialTabs"
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={refresh}
          refreshing={refreshing}
          tintColor={colors.primary}
        />
      }
      scroll
    >
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Voice"
        subtitle="Available on Monday, Wednesday, and Friday until you complete it that day."
        title="Voice check-in"
      />

      {pending === null ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : pending ? (
        <View style={styles.list}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/forms/voice-checkin" as Href)}
            style={({ pressed }) => [pressed && styles.rowPressed]}
          >
            <Card variant="outline" style={styles.rowCard}>
              <View style={styles.rowMain}>
                <View style={styles.rowIcon}>
                  <Ionicons color={colors.primary} name="mic-outline" size={22} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleRow}>
                    <Text style={[styles.formTitle, typography.title]}>
                      {VOICE_CHECKIN_FORM.name}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, typography.micro]}>
                        ASSIGNED
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.formDescription, typography.body]}>
                    {VOICE_CHECKIN_FORM.description}
                  </Text>
                </View>
                <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
              </View>
            </Card>
          </Pressable>
        </View>
      ) : (
        <EmptyState
          icon="checkmark-circle-outline"
          subtitle="Voice check-ins open on Monday, Wednesday, and Friday only. If today’s window passes without a submission, it closes until the next scheduled day."
          title="No outstanding assignments"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  rowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  rowCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  formTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.accentMuted,
    letterSpacing: 0.55,
    fontFamily: typography.micro.fontFamily,
    fontSize: 11,
  },
  formDescription: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: typography.body.fontFamily,
  },
});

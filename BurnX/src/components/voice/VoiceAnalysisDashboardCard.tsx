import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  loadVoiceAnalysisSessions,
  VOICE_ANALYSIS_BASE_URL,
  type VoiceAnalysisSession,
} from "../../lib/voice-analysis";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { VoiceAnalysisModal } from "./VoiceAnalysisModal";

function formatPercent(value: number | null): string {
  if (value === null) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatRate(value: number | null): string {
  if (value === null) return "n/a";
  return value.toFixed(1);
}

function latestLabel(session: VoiceAnalysisSession | null): string {
  if (!session) return "No sessions yet";
  const d = new Date(session.recorded_at);
  if (!Number.isFinite(d.getTime())) return "Latest session";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

type VoiceAnalysisDashboardCardProps = {
  /** Renders inside the Voice tab without extra outer margin tweaks. */
  embedded?: boolean;
};

export function VoiceAnalysisDashboardCard({
  embedded = false,
}: VoiceAnalysisDashboardCardProps) {
  const [sessions, setSessions] = useState<VoiceAnalysisSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const configured = VOICE_ANALYSIS_BASE_URL !== "";
  const latest = sessions[0] ?? null;
  const features = latest?.features ?? null;

  const load = useCallback(async () => {
    if (!configured) {
      setError("Set EXPO_PUBLIC_VOICE_ANALYSIS_URL to show local voice analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadVoiceAnalysisSessions();
      setSessions(next);
      setSelectedIndex((cur) => Math.min(cur, Math.max(next.length - 1, 0)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voice analysis could not load.");
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("neotherm-voice-analysis-refresh", () => {
      void load();
    });
    return () => {
      sub.remove();
    };
  }, [load]);

  useEffect(() => {
    let current: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      const previous = current;
      current = next;
      if ((previous === "inactive" || previous === "background") && next === "active") {
        void load();
      }
    });
    return () => {
      sub.remove();
    };
  }, [load]);

  const status = useMemo(() => {
    if (!configured) return "Local URL needed";
    if (loading) return "Loading";
    if (error) return "Needs service";
    if (!latest) return "No sessions";
    if (!features) return "Processing";
    return "Ready";
  }, [configured, error, features, latest, loading]);
  const analysisError = latest?.error ?? null;

  const onCardPress = () => {
    setModalOpen(true);
  };

  return (
    <>
      <Pressable
        accessibilityHint="Opens voice analysis history"
        accessibilityLabel="Voice analysis card"
        accessibilityRole="button"
        onPress={onCardPress}
        style={({ pressed }) => [
          styles.card,
          embedded && styles.cardEmbedded,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.icon}>
              <Ionicons color={colors.primary} name="mic-outline" size={22} />
            </View>
            <View>
              <Text style={[styles.title, typography.title]}>Voice Analysis</Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            {loading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.statusText}>{status}</Text>
            )}
          </View>
        </View>

        {error || analysisError ? (
          <View style={styles.messageRow}>
            <Ionicons color={colors.warning} name="information-circle-outline" size={20} />
            <Text style={[styles.messageText, typography.caption]}>
              {error ?? analysisError}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.latestLabel, typography.caption]}>
              {latestLabel(latest)}
            </Text>
            <View style={styles.metrics}>
              <View style={styles.metricBlock}>
                <Text style={styles.metricValue}>
                  {formatPercent(features?.voice_stability ?? null)}
                </Text>
                <Text style={styles.metricLabel}>stability</Text>
              </View>
              <View style={styles.metricBlock}>
                <Text style={styles.metricValue}>
                  {formatRate(features?.speech_pace ?? null)}
                </Text>
                <Text style={styles.metricLabel}>pace</Text>
              </View>
              <View style={styles.metricBlock}>
                <Text style={styles.metricValue}>
                  {formatPercent(features?.speech_flow ?? null)}
                </Text>
                <Text style={styles.metricLabel}>flow</Text>
              </View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
            </View>
          </>
        )}

      </Pressable>

      <VoiceAnalysisModal
        selectedIndex={selectedIndex}
        sessions={sessions}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectIndex={setSelectedIndex}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardEmbedded: {
    marginTop: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  latestLabel: {
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metricBlock: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm,
  },
  metricValue: {
    ...typography.title,
    color: colors.text,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
  },
  messageText: {
    color: colors.warning,
    flex: 1,
  },
});

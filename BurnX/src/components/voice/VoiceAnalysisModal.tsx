import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { VoiceAnalysisSession } from "../../lib/voice-analysis";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type VoiceAnalysisModalProps = {
  visible: boolean;
  sessions: VoiceAnalysisSession[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
};

function formatRecordedAt(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Recent session";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatPercent(value: number | null): string {
  if (value === null) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatRate(value: number | null): string {
  if (value === null) return "n/a";
  return value.toFixed(1);
}

function stabilityLabel(value: number | null): string {
  if (value === null) return "Waiting for signal";
  if (value < 0.05) return "Steady";
  if (value < 0.12) return "Moderate";
  return "Variable";
}

function flowLabel(value: number | null): string {
  if (value === null) return "Waiting for signal";
  if (value < 0.25) return "Continuous";
  if (value < 0.5) return "Some pauses";
  return "More pauses";
}

function MetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={styles.metricRow}>
      <View>
        <Text style={[styles.metricLabel, typography.micro]}>{label}</Text>
        <Text style={[styles.metricDetail, typography.caption]}>{detail}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function VoiceAnalysisModal({
  visible,
  sessions,
  selectedIndex,
  onSelectIndex,
  onClose,
}: VoiceAnalysisModalProps) {
  const insets = useSafeAreaInsets();
  const clampedIndex = Math.min(Math.max(selectedIndex, 0), Math.max(sessions.length - 1, 0));
  const selected = sessions[clampedIndex] ?? null;
  const features = selected?.features ?? null;
  const canGoBack = clampedIndex < sessions.length - 1;
  const canGoForward = clampedIndex > 0;

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
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            paddingTop: Platform.OS === "ios" ? insets.top + spacing.md : spacing.lg,
          },
        ]}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, typography.headlineMedium]}>
                Voice Analysis
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close voice analysis"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={26} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selected ? (
              <>
                <View style={styles.sessionCard}>
                  <Text style={[styles.sessionLabel, typography.micro]}>
                    {formatRecordedAt(selected.recorded_at)}
                  </Text>
                  <Text style={[styles.sessionTitle, typography.title]}>
                    Acoustic trends
                  </Text>
                  <Text style={[styles.sessionCopy, typography.caption]}>
                    Estimated acoustic trends from your voice recordings.
                  </Text>
                </View>

                <View style={styles.metricsCard}>
                  <MetricRow
                    detail={stabilityLabel(features?.voice_stability ?? null)}
                    label="Voice stability"
                    value={formatPercent(features?.voice_stability ?? null)}
                  />
                  <MetricRow
                    detail="syllable-like beats per second"
                    label="Speech pace"
                    value={formatRate(features?.speech_pace ?? null)}
                  />
                  <MetricRow
                    detail={flowLabel(features?.speech_flow ?? null)}
                    label="Speech flow"
                    value={formatPercent(features?.speech_flow ?? null)}
                  />
                </View>

                {selected.error ? (
                  <View style={styles.warningCard}>
                    <Ionicons color={colors.warning} name="warning-outline" size={20} />
                    <Text style={[styles.warningText, typography.caption]}>
                      Some recordings could not be fully analyzed: {selected.error}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.navRow}>
                  <Pressable
                    accessibilityLabel="Show older voice session"
                    accessibilityRole="button"
                    disabled={!canGoBack}
                    onPress={() => onSelectIndex(clampedIndex + 1)}
                    style={({ pressed }) => [
                      styles.navButton,
                      !canGoBack && styles.navDisabled,
                      pressed && canGoBack && { opacity: 0.82 },
                    ]}
                  >
                    <Ionicons color={colors.primary} name="chevron-back" size={18} />
                    <Text style={styles.navText}>Older</Text>
                  </Pressable>
                  <Text style={[styles.pageText, typography.caption]}>
                    {clampedIndex + 1} of {sessions.length}
                  </Text>
                  <Pressable
                    accessibilityLabel="Show newer voice session"
                    accessibilityRole="button"
                    disabled={!canGoForward}
                    onPress={() => onSelectIndex(clampedIndex - 1)}
                    style={({ pressed }) => [
                      styles.navButton,
                      !canGoForward && styles.navDisabled,
                      pressed && canGoForward && { opacity: 0.82 },
                    ]}
                  >
                    <Text style={styles.navText}>Newer</Text>
                    <Ionicons color={colors.primary} name="chevron-forward" size={18} />
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons color={colors.textMuted} name="mic-outline" size={28} />
                <Text style={[styles.emptyTitle, typography.title]}>
                  No voice sessions yet
                </Text>
                <Text style={[styles.emptyText, typography.caption]}>
                  Record voice samples in Care Programs to build your trend history.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
  },
  sessionCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sessionLabel: {
    color: colors.primary,
    textTransform: "uppercase",
  },
  sessionTitle: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  sessionCopy: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  metricsCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  metricDetail: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricValue: {
    ...typography.headlineMedium,
    color: colors.text,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  warningText: {
    color: colors.warning,
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  navButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  navDisabled: {
    opacity: 0.4,
  },
  navText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  pageText: {
    color: colors.textMuted,
  },
  emptyCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
});

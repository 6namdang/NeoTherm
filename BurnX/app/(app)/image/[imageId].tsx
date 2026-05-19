import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { WOUND_BODY_LOCATIONS } from "../../../src/constants/wound-body-locations";
import type { WoundImage } from "../../../src/lib/api";
import { getMyWoundImages, getWoundImageViewUrl, isVlmFailure, isVlmSuccess } from "../../../src/lib/api";
import type { WoundVlmAnalysisScores } from "../../../src/types/wound-vlm-analysis";
import { colors } from "../../../src/theme/colors";
import { radius, spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";
import { fontFamily } from "../../../src/theme/fontFamily";
import { formatPhotoTakenMedium } from "../../../src/lib/format-photo-date";
import { woundProcessingComplete } from "../../../src/lib/wound-image-status";
import { bxLog } from "../../../src/lib/debug-log";

function bodyLocationLabel(value: string | null): string | null {
  if (value === null || value.trim() === "") return null;
  const f = WOUND_BODY_LOCATIONS.find((x) => x.value === value);
  return f?.label ?? value;
}

type ScoreRowDef = {
  key: keyof WoundVlmAnalysisScores;
  label: string;
  polarity: "high_worse" | "high_better";
};

const SCORE_ROWS: ScoreRowDef[] = [
  { key: "burn_severity", label: "Burn severity", polarity: "high_worse" },
  { key: "tissue_health", label: "Tissue health", polarity: "high_better" },
  { key: "infection_risk", label: "Infection risk (visual estimate)", polarity: "high_worse" },
  { key: "inflammation", label: "Inflammation", polarity: "high_worse" },
  { key: "healing_progress", label: "Healing progress", polarity: "high_better" },
];

function ScoreMeter({
  value,
  label,
  polarity,
}: {
  value: number | null;
  label: string;
  polarity: "high_worse" | "high_better";
}) {
  const has = value !== null && Number.isFinite(value);
  const pct = has ? Math.min(100, Math.max(0, value!)) : 0;
  const fillColor =
    !has
      ? colors.border
      : polarity === "high_better"
        ? colors.success
        : colors.danger;

  const trackSurface = polarity === "high_better" ? colors.successSoft : colors.primarySoft;

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreLabelRow}>
        <Text style={[typography.caption, styles.scoreLabel]}>{label}</Text>
        <View style={[styles.scoreValuePill, !has ? styles.scoreValuePillMuted : styles.scoreValuePillActive]}>
          <Text style={[typography.micro, styles.scoreValuePillText, !has && styles.scoreValueMuted]}>
            {has ? `${Math.round(value!)}` : "—"}
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: trackSurface }]}>
        {has ? (
          <View style={[styles.scoreBarFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
        ) : (
          <View style={styles.fillEmpty} />
        )}
      </View>
      {!has ? (
        <Text style={[styles.scoreHint, typography.micro]}>Not scored for this image</Text>
      ) : null}
    </View>
  );
}

export default function WoundImageDetailScreen() {
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const id = typeof imageId === "string" ? imageId : String(imageId ?? "");

  const [row, setRow] = useState<WoundImage | null | undefined>(undefined);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [heroLoadError, setHeroLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clinicalOpen, setClinicalOpen] = useState(false);

  const loadRow = useCallback(async () => {
    const { items } = await getMyWoundImages(50);
    const found = items.find((i) => i.image_id === id) ?? null;
    setRow(found);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          await loadRow();
        } catch {
          if (!cancelled) setRow(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadRow]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (id === "") return;
      try {
        const { url } = await getWoundImageViewUrl(id);
        if (!cancelled) {
          setImageUri(url);
          setHeroLoadError(false);
        }
      } catch (e) {
        if (!cancelled) {
          bxLog("wound-image", "hero view-url failed", id, e);
          setImageUri(null);
          setHeroLoadError(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRow();
      if (id !== "") {
        try {
          const { url } = await getWoundImageViewUrl(id);
          setImageUri(url);
          setHeroLoadError(false);
        } catch (e) {
          bxLog("wound-image", "hero view-url failed (refresh)", id, e);
          setImageUri(null);
          setHeroLoadError(false);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [id, loadRow]);

  if (Platform.OS === "web") {
    return (
      <Screen preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader title="Photo detail" onBackPress={() => router.back()} />
        <Text style={[typography.body, styles.webMsg]}>Open this screen in the BurnX mobile app.</Text>
      </Screen>
    );
  }

  if (id === "") {
    return (
      <Screen preset="stack" scroll>
        <PageHeader title="Photo" onBackPress={() => router.back()} />
        <Text style={typography.body}>Missing photo reference.</Text>
      </Screen>
    );
  }

  if (row === undefined) {
    return (
      <Screen preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader title="Wound photo" onBackPress={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (row === null) {
    return (
      <Screen
        preset="stack"
        scroll
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <StatusBar style="dark" />
        <PageHeader title="Wound photo" onBackPress={() => router.back()} />
        <Text style={[typography.body, styles.webMsg]}>
          We could not find this photo. Pull to refresh, or go back to your list.
        </Text>
      </Screen>
    );
  }

  const analysis = row.vlm_analysis;
  const pending = !woundProcessingComplete(row);
  const failed = analysis !== null && isVlmFailure(analysis);
  const hasSuccessAnalysis = analysis !== null && isVlmSuccess(analysis);

  return (
    <Screen
      preset="stack"
      scroll
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={() => void onRefresh()}
          refreshing={refreshing}
          tintColor={colors.primary}
        />
      }
    >
      <StatusBar style="dark" />
      <PageHeader title="Wound photo" onBackPress={() => router.back()} />

      <View style={styles.heroFrame}>
        {imageUri && !heroLoadError ? (
          <Image
            contentFit="contain"
            onError={(e) => {
              bxLog("wound-image", "hero load error", id, e);
              setHeroLoadError(true);
            }}
            source={{ uri: imageUri }}
            style={styles.heroInner}
            transition={200}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons color={colors.textMuted} name="image-outline" size={48} />
            <Text style={[typography.caption, styles.muted]}>Image could not be loaded</Text>
          </View>
        )}
      </View>

      <View style={styles.metaChips}>
        <View style={styles.metaChip}>
          <Ionicons color={colors.primary} name="calendar-outline" size={16} />
          <Text style={[typography.bodyStrong, styles.metaChipText]} numberOfLines={2}>
            {formatPhotoTakenMedium(row.recorded_at || row.created_at)}
          </Text>
        </View>
        {bodyLocationLabel(row.body_location) !== null ? (
          <View style={styles.metaChip}>
            <Ionicons color={colors.primary} name="body-outline" size={16} />
            <Text style={[typography.body, styles.metaChipText]} numberOfLines={2}>
              {bodyLocationLabel(row.body_location)}
            </Text>
          </View>
        ) : null}
      </View>
      {row.notes !== null && row.notes.trim() !== "" ? (
        <View style={styles.noteBox}>
          <View style={styles.noteHeader}>
            <Ionicons color={colors.primary} name="chatbox-ellipses-outline" size={18} />
            <Text style={[typography.micro, styles.noteEyebrow]}>Your notes</Text>
          </View>
          <Text style={[typography.body, styles.noteText]}>{row.notes.trim()}</Text>
        </View>
      ) : null}

      {pending ? (
        <View style={styles.pendingBox}>
          <View style={styles.pendingIconWrap}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
          <Text style={[typography.bodyStrong, styles.pendingText]}>Analyzing your photo</Text>
          <Text style={[typography.caption, styles.mutedCenter]}>
            This usually finishes within a minute. Pull down to refresh anytime.
          </Text>
        </View>
      ) : null}

      {failed ? (
        <View style={styles.warnCard}>
          <Ionicons color={colors.warning} name="alert-circle-outline" size={22} style={styles.cardIconLead} />
          <Text style={[typography.body, styles.warnText]}>
            Analysis could not be completed for this photo. If this keeps happening, tell your care team.
          </Text>
        </View>
      ) : null}

      {hasSuccessAnalysis && analysis ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={[typography.micro, styles.summaryEyebrow]}>Overview</Text>
            <Text style={[typography.body, styles.friendly]}>{analysis.patient_friendly_summary}</Text>
          </View>

          {analysis.requires_clinician_attention ? (
            <View style={styles.attentionCard}>
              <View style={styles.attentionIcon}>
                <Ionicons color={colors.primaryForeground} name="medkit" size={20} />
              </View>
              <Text style={[typography.body, styles.attentionText]}>
                Your care team will want to review this photo alongside your usual follow-up.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: clinicalOpen }}
            onPress={() => setClinicalOpen((o) => !o)}
            style={({ pressed }) => [styles.clinicalHeader, pressed && styles.clinicalHeaderPressed]}
          >
            <View style={styles.clinicalHeaderLead}>
              <Ionicons color={colors.chartCardTitle} name="pulse-outline" size={22} />
              <Text style={[typography.bodyStrong, styles.clinicalTitle]}>Clinical scores</Text>
            </View>
            <Ionicons
              color={colors.textMuted}
              name={clinicalOpen ? "chevron-up" : "chevron-down"}
              size={22}
            />
          </Pressable>

          {clinicalOpen ? (
            <View style={styles.clinicalSheet}>
              {SCORE_ROWS.map((s) => (
                <ScoreMeter key={s.key} label={s.label} polarity={s.polarity} value={analysis.scores[s.key]} />
              ))}
              {analysis.score_explanation.trim() !== "" ? (
                <View style={styles.explainBox}>
                  <Text style={[typography.micro, styles.explainEyebrow]}>How scores were judged</Text>
                  <Text style={[typography.caption, styles.explain]}>{analysis.score_explanation.trim()}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {!pending && !failed && !hasSuccessAnalysis && woundProcessingComplete(row) ? (
        <Text style={[typography.body, styles.mutedPlain]}>Summary is not available for this photo yet.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  webMsg: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  heroFrame: {
    width: "100%",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  heroInner: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
  },
  heroPlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  metaChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "100%",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  metaChipText: {
    color: colors.text,
    flexShrink: 1,
  },
  noteBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteEyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    color: colors.text,
    lineHeight: 24,
  },
  pendingBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingIconWrap: {
    paddingVertical: spacing.sm,
  },
  pendingText: {
    textAlign: "center",
    color: colors.text,
    marginTop: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  mutedCenter: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  mutedPlain: {
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  warnCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  cardIconLead: {
    marginTop: 2,
  },
  warnText: {
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.chartCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  summaryEyebrow: {
    color: colors.chartCardTitle,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  friendly: {
    color: colors.text,
    lineHeight: 26,
    letterSpacing: -0.15,
  },
  attentionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  attentionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  attentionText: {
    flex: 1,
    color: colors.primaryForeground,
    lineHeight: 22,
  },
  clinicalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clinicalHeaderPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  clinicalHeaderLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  clinicalTitle: {
    color: colors.chartCardTitle,
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
  },
  clinicalSheet: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  scoreCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  scoreLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  scoreLabel: {
    color: colors.textSecondary,
    flex: 1,
  },
  scoreValuePill: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValuePillActive: {
    backgroundColor: colors.primarySoft,
  },
  scoreValuePillMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  scoreValuePillText: {
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  scoreValueMuted: {
    color: colors.textMuted,
  },
  scoreHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  track: {
    height: 13,
    borderRadius: 8,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  fillEmpty: {
    height: "100%",
    width: "100%",
    backgroundColor: colors.border,
    opacity: 0.55,
    borderRadius: 8,
  },
  explainBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  explainEyebrow: {
    color: colors.chartCardTitle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  explain: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

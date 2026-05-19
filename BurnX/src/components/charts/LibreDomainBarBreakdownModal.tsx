import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { LIBRE_DOMAIN_BAR_GRADIENT } from "../../constants/libre-chart-palette";
import type {
  LibreDashboardSubmissionSnapshot,
  LibreRadarDomainSlice,
} from "../../lib/libre-scoring";
import {
  LIBRE_RADAR_AXIS_SHORT,
  LIBRE_RADAR_SECTION_ORDER,
} from "../../lib/libre-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const BRAVO_NAVY = "#0C2340";
const BASELINE_REFERENCE = 50;
const T_MIN = 20;
const T_MAX = 80;

/** Bar geometry: flat right edge (“square tip”), softly rounded track and left anchor. */
const BAR_H = 12;
const BAR_CORNER_R = 3;

const MODAL_SURFACE = "#F9FAFB";
const MODAL_STROKE = "rgba(12, 35, 64, 0.08)";
const TRACK_BG = "rgba(12, 35, 64, 0.072)";

/**
 * Horizontal fill: rounded leading (left) edge only; trailing edge square so the bar
 * doesn’t read like a tapered capsule.
 */
function fillBarPath(barW: number, h: number, rx: number): string {
  const w = Math.max(0, barW);
  if (w <= 0.001) return "";
  const r = Math.min(rx, h / 2);
  if (w <= r + 1e-3) {
    return `M 0 0 H ${w} V ${h} H 0 Z`;
  }
  return (
    `M ${r} 0 H ${w} V ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
  );
}

type Props = {
  visible: boolean;
  /** Newest first (same order as dashboard fetch). Empty closes detail affordances upstream. */
  history: LibreDashboardSubmissionSnapshot[];
  onClose: () => void;
};

function clampT(t: number | null): number {
  if (t === null || !Number.isFinite(t)) return T_MIN;
  return Math.min(T_MAX, Math.max(T_MIN, t));
}

function pctForT(t: number | null): number {
  const c = clampT(t);
  return ((c - T_MIN) / (T_MAX - T_MIN)) * 100;
}

function formatSubmissionTime(iso: string): string | null {
  if (!iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function LibreDomainBarBreakdownModal({
  visible,
  history,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [submissionIndex, setSubmissionIndex] = useState(0);

  useEffect(() => {
    if (visible) setSubmissionIndex(0);
  }, [visible]);

  const cappedIndex = Math.min(
    submissionIndex,
    Math.max(0, history.length - 1),
  );

  useEffect(() => {
    setSubmissionIndex((i) =>
      Math.min(i, Math.max(0, history.length - 1)),
    );
  }, [history.length]);

  const current = history[cappedIndex] ?? null;

  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

  const body = (
    <ModalBody
      current={current}
      historyLength={history.length}
      index={cappedIndex}
      onClose={onClose}
      onOlder={() =>
        setSubmissionIndex((v) =>
          Math.min(v + 1, Math.max(0, history.length - 1)),
        )
      }
      onNewer={() => setSubmissionIndex((v) => Math.max(v - 1, 0))}
    />
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={presentationStyle}
      transparent={Platform.OS !== "ios"}
      visible={visible}
    >
      {Platform.OS !== "ios" ? (
        <View style={styles.backdrop}>
          <Pressable
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdropTap}
          />
          <View
            style={[
              styles.androidSheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            {body}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.iosWrap,
            {
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              paddingTop: insets.top + 8,
            },
          ]}
        >
          {body}
        </View>
      )}
    </Modal>
  );
}

function SnapshotSummaryStrip({
  domains,
  overallTScore,
  submittedFormatted,
}: {
  domains: LibreRadarDomainSlice[];
  overallTScore: number | null;
  submittedFormatted: string | null;
}) {
  const scoredCount = domains.filter((d) => d.tScore !== null).length;
  const atOrAboveRef = domains.filter(
    (d) => d.tScore !== null && d.tScore >= BASELINE_REFERENCE,
  ).length;

  const tiles = [
    {
      label: "Overall profile",
      value:
        overallTScore !== null
          ? String(Math.round(overallTScore * 10) / 10)
          : "n/a",
      hint: "Mean of answered sections",
    },
    {
      label: "Sections scored",
      value: `${scoredCount}/${LIBRE_RADAR_SECTION_ORDER.length}`,
      hint: "Life areas with a T-score",
    },
    {
      label: `At or above ~${BASELINE_REFERENCE}`,
      value: String(atOrAboveRef),
      hint: "Compared to midpoint reference",
    },
    {
      label: "Reference band",
      value: `${T_MIN} to ${T_MAX}`,
      hint: "Approximate scale width",
    },
  ];

  return (
    <View style={styles.summaryCard}>
      {submittedFormatted ? (
        <Text style={[typography.micro, styles.summaryStamp]}>
          Snapshot · {submittedFormatted}
        </Text>
      ) : (
        <Text style={[typography.micro, styles.summaryStampMuted]}>
          Submission time unavailable
        </Text>
      )}
      <View style={styles.summaryGrid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.summaryTile}>
            <Text style={[typography.micro, styles.summaryTileLabel]}>
              {t.label}
            </Text>
            <Text style={[typography.title, styles.summaryTileValue]}>
              {t.value}
            </Text>
            <Text style={[typography.caption, styles.summaryTileHint]}>
              {t.hint}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SubmissionPager({
  index,
  total,
  canGoOlder,
  canGoNewer,
  onOlder,
  onNewer,
}: {
  index: number;
  total: number;
  canGoOlder: boolean;
  canGoNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
}) {
  if (total <= 1) return null;

  const position = `${index + 1} · ${total}`;

  return (
    <View style={styles.pagerWrap}>
      <Pressable
        accessibilityHint="Older LIBRE questionnaire"
        accessibilityLabel="Older submission"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoOlder }}
        disabled={!canGoOlder}
        hitSlop={10}
        onPress={onOlder}
        style={({ pressed }) => [
          styles.pagerChip,
          !canGoOlder && styles.pagerChipDisabled,
          pressed && canGoOlder && styles.pagerChipPressed,
        ]}
      >
        <Ionicons
          color={canGoOlder ? BRAVO_NAVY : colors.textMuted}
          name="chevron-back"
          size={22}
        />
        <Text
          style={[
            typography.caption,
            styles.pagerChipText,
            !canGoOlder && styles.pagerChipTextDisabled,
          ]}
        >
          Older
        </Text>
      </Pressable>

      <Text style={[typography.micro, styles.pagerPosition]}>{position}</Text>

      <Pressable
        accessibilityHint="Newer LIBRE questionnaire"
        accessibilityLabel="Newer submission"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoNewer }}
        disabled={!canGoNewer}
        hitSlop={10}
        onPress={onNewer}
        style={({ pressed }) => [
          styles.pagerChip,
          styles.pagerChipReverse,
          !canGoNewer && styles.pagerChipDisabled,
          pressed && canGoNewer && styles.pagerChipPressed,
        ]}
      >
        <Text
          style={[
            typography.caption,
            styles.pagerChipText,
            !canGoNewer && styles.pagerChipTextDisabled,
          ]}
        >
          Newer
        </Text>
        <Ionicons
          color={canGoNewer ? BRAVO_NAVY : colors.textMuted}
          name="chevron-forward"
          size={22}
        />
      </Pressable>
    </View>
  );
}

function ModalBody({
  current,
  historyLength,
  index,
  onClose,
  onOlder,
  onNewer,
}: {
  current: LibreDashboardSubmissionSnapshot | null;
  historyLength: number;
  index: number;
  onClose: () => void;
  onOlder: () => void;
  onNewer: () => void;
}) {
  const domains = current?.domains ?? [];
  const overallTScore = current?.overallTScore ?? null;
  const submittedFormatted = current
    ? formatSubmissionTime(current.createdAtIso)
    : null;

  const byId = Object.fromEntries(
    domains.map((d) => [d.sectionId, d]),
  ) as Record<(typeof LIBRE_RADAR_SECTION_ORDER)[number], LibreRadarDomainSlice>;

  const rows = LIBRE_RADAR_SECTION_ORDER.map((sid) => ({
    slice: byId[sid],
    gradient: LIBRE_DOMAIN_BAR_GRADIENT[sid],
    gradId: `libre-bar-${sid}-${index}`,
    sid,
  }));

  const canGoOlder = index < historyLength - 1;
  const canGoNewer = index > 0;

  return (
    <View style={styles.sheet}>
      <View style={styles.modalHeader}>
        <View style={styles.modalHeaderTitles}>
          <Text style={[typography.title, styles.modalTitle]}>LIBRE detail</Text>
          <Text style={[typography.caption, styles.modalSub]}>
            Approximate PROM T-scores by life area ({T_MIN} to {T_MAX}), shown as filled
            tracks. This matches the spider snapshot, not longitudinal change.
          </Text>
          <SubmissionPager
            canGoNewer={canGoNewer}
            canGoOlder={canGoOlder}
            index={index}
            onNewer={onNewer}
            onOlder={onOlder}
            total={historyLength}
          />
        </View>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.72 }]}
        >
          <Ionicons color={colors.textMuted} name="close" size={26} />
        </Pressable>
      </View>

      {domains.length === 0 ? (
        <Text style={[typography.body, styles.emptyBody]}>
          No scorable LIBRE answers for this submission.
        </Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <SnapshotSummaryStrip
            domains={domains}
            overallTScore={overallTScore}
            submittedFormatted={submittedFormatted}
          />

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Sections
          </Text>

          {rows.map(({ slice, gradient, gradId, sid }) => {
            const t = slice?.tScore ?? null;
            const label = slice?.label ?? sid;
            const short = LIBRE_RADAR_AXIS_SHORT[sid] ?? "n/a";
            const fillPct = pctForT(t);
            const barW = Math.max((fillPct / 100) * 100, t !== null ? 2 : 0);
            const tint = gradient[0];
            const refX = (pctForT(BASELINE_REFERENCE) / 100) * 100;
            const fillD = fillBarPath(barW, BAR_H, BAR_CORNER_R);

            return (
              <View key={sid} style={styles.domainRowCard}>
                <View style={styles.domainTopRow}>
                  <View style={[styles.tintBlob, { backgroundColor: tint }]} />
                  <View style={styles.domainTextCol}>
                    <Text
                      numberOfLines={2}
                      style={[typography.caption, styles.domainTitle]}
                    >
                      {label}
                    </Text>
                    <Text style={[typography.micro, styles.domainCode]}>
                      {short}
                    </Text>
                  </View>
                  <Text style={[typography.title, styles.tVal]}>
                    {t !== null ? Math.round(t) : "n/a"}
                  </Text>
                </View>
                <View style={styles.track}>
                  <Svg
                    height={BAR_H}
                    preserveAspectRatio="none"
                    viewBox={`0 0 100 ${BAR_H}`}
                    width="100%"
                  >
                    <Defs>
                      <LinearGradient
                        gradientUnits="userSpaceOnUse"
                        id={gradId}
                        x1="0"
                        x2="100"
                        y1="0"
                        y2="0"
                      >
                        <Stop offset="0" stopColor={gradient[1]} />
                        <Stop offset="1" stopColor={gradient[0]} />
                      </LinearGradient>
                    </Defs>
                    {fillD !== "" ? (
                      <Path d={fillD} fill={`url(#${gradId})`} />
                    ) : null}
                    <Line
                      stroke="rgba(12,35,64,0.38)"
                      strokeLinecap="butt"
                      strokeWidth={1}
                      x1={refX}
                      x2={refX}
                      y1={0}
                      y2={BAR_H}
                    />
                  </Svg>
                </View>
              </View>
            );
          })}

          <View style={styles.insightCard}>
            <Text style={[typography.micro, styles.insightTitle]}>
              How to read this
            </Text>
            <Text style={[typography.caption, styles.insightLine]}>
              • Bars are approximate PROM-style T-scores; {BASELINE_REFERENCE} is a
              population midpoint, not your personal baseline.
            </Text>
            <Text style={[typography.caption, styles.insightLine]}>
              • Partial questionnaires may leave sections blank (“n/a”).
            </Text>
            <Text style={[typography.caption, styles.insightLine]}>
              • Use Older / Newer to compare separate submissions. Line charts appear
              when history APIs land.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  backdropTap: {
    flex: 1,
  },
  androidSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    maxHeight: "92%",
    backgroundColor: colors.surface,
  },
  sheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg + 6,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.lg,
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  modalHeaderTitles: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs + 4,
  },
  modalTitle: {
    color: BRAVO_NAVY,
    letterSpacing: -0.35,
    fontFamily: typography.title.fontFamily,
  },
  modalSub: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  pagerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm + 2,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  pagerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.sm,
    backgroundColor: MODAL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MODAL_STROKE,
  },
  pagerChipReverse: {
    flexDirection: "row-reverse",
  },
  pagerChipDisabled: {
    opacity: 0.52,
    borderColor: "transparent",
  },
  pagerChipPressed: {
    opacity: 0.88,
  },
  pagerChipText: {
    color: BRAVO_NAVY,
    fontWeight: "700",
  },
  pagerChipTextDisabled: {
    color: colors.textMuted,
  },
  pagerPosition: {
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    flex: 1,
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: MODAL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MODAL_STROKE,
  },
  scroll: {
    alignSelf: "stretch",
    maxHeight: 560,
  },
  emptyBody: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    backgroundColor: MODAL_SURFACE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MODAL_STROKE,
    padding: spacing.md + 2,
    marginBottom: spacing.lg + 2,
    gap: spacing.sm + 4,
  },
  summaryStamp: {
    color: BRAVO_NAVY,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  summaryStampMuted: {
    color: colors.textMuted,
    fontFamily: typography.micro.fontFamily,
    fontStyle: "italic",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 6,
    justifyContent: "space-between",
  },
  summaryTile: {
    width: "47%",
    minWidth: 130,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  summaryTileLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.65,
    fontSize: 10,
  },
  summaryTileValue: {
    color: BRAVO_NAVY,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ["tabular-nums"],
  },
  summaryTileHint: {
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: "500",
  },
  sectionEyebrow: {
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontWeight: "800",
    marginBottom: spacing.sm + 4,
    marginLeft: 2,
  },
  domainRowCard: {
    backgroundColor: MODAL_SURFACE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MODAL_STROKE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
    gap: spacing.sm + 4,
    marginBottom: spacing.sm + 4,
  },
  domainTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 4,
  },
  tintBlob: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginTop: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(12,35,64,0.14)",
  },
  domainTextCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  domainTitle: {
    color: BRAVO_NAVY,
    fontWeight: "700",
    lineHeight: 20,
    fontFamily: typography.caption.fontFamily,
  },
  domainCode: {
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.85,
    textTransform: "uppercase",
  },
  tVal: {
    color: BRAVO_NAVY,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 40,
    textAlign: "right",
    marginTop: 2,
    fontSize: 18,
  },
  track: {
    alignSelf: "stretch",
    height: BAR_H,
    borderRadius: BAR_CORNER_R,
    overflow: "hidden",
    backgroundColor: TRACK_BG,
  },
  insightCard: {
    marginTop: spacing.md,
    padding: spacing.md + 2,
    marginBottom: spacing.lg + 18,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MODAL_STROKE,
    backgroundColor: MODAL_SURFACE,
    gap: spacing.sm,
  },
  insightTitle: {
    color: BRAVO_NAVY,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.95,
    marginBottom: 4,
  },
  insightLine: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
});

/**
 * PSQI visualization. Global score as a Stephen Few style reference arc (gauge band)
 * plus a seven-domain “burden matrix” (graded blocks per 0 to 3 PSQI component score).
 * Designed for mobile legibility: arc encodes total vs clinical cutoffs; matrix shows where burden sits.
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import { PsqiEducationModal } from "./PsqiEducationModal";
import { AnimatedArcGauge } from "./ui/AnimatedArcGauge";
import { AnimatedStackSegment } from "./ui/AnimatedStackSegment";
import { ClinicalHistoryModal, type ClinicalHistoryPoint } from "./ui/ClinicalHistoryModal";
import { PSQI_DOMAIN_ACCENT } from "../../constants/psqi-chart-palette";
import {
  PSQI_DOMAIN_ORDER,
  PSQI_DOMAIN_LABELS,
  psqiClinicalBand,
  type PsqiDashboardSubmissionSnapshot,
  type PsqiDomainId,
} from "../../lib/psqi-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const CARD = {
  fg: "#0F172A",
  muted: "#64748B",
  track: "#E2E8F0",
};

const BAND_FILL: Record<"good" | "moderate" | "poor", string> = {
  good: "#059669",
  moderate: "#D97706",
  poor: "#BE123C",
};

const DOMAIN_MICRO: Record<PsqiDomainId, string> = {
  durat: "Dur",
  distb: "Dist",
  laten: "Late",
  daydys: "Day",
  hse: "Eff",
  sq: "Qual",
  meds: "Rx",
};

const PSQI_GLOBAL_MAX = 21;
/** Width of anchored domain tooltip under the burden matrix */
const PSQI_DOMAIN_TOOLTIP_W = 268;

function formatSubmitted(iso: string | null): string | null {
  if (iso === null || typeof iso !== "string" || iso.trim() === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

type Props = {
  snapshot: PsqiDashboardSubmissionSnapshot | null;
  history?: ClinicalHistoryPoint[];
};

export function PsqiSleepQualityCard({ snapshot, history = [] }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [focusedDomainId, setFocusedDomainId] = useState<PsqiDomainId | null>(
    null,
  );
  const [domainRowMetrics, setDomainRowMetrics] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [domainColLayouts, setDomainColLayouts] = useState<
    Partial<Record<PsqiDomainId, { x: number; width: number }>>
  >({});
  const openModal = () => setModalOpen(true);
  const submittedLine = useMemo(
    () => formatSubmitted(snapshot?.createdAtIso ?? null),
    [snapshot?.createdAtIso],
  );

  const band = psqiClinicalBand(snapshot?.total ?? null);
  const total = snapshot?.total ?? null;
  const animateKey = snapshot?.createdAtIso ?? "psqi-empty";
  const valueStroke =
    band === "good"
      ? "url(#psqiGaugeGood)"
      : band === "moderate"
        ? "#F59E0B"
        : "url(#psqiGaugePoor)";
  const knobColor =
    band === "good"
      ? BAND_FILL.good
      : band === "moderate"
        ? BAND_FILL.moderate
        : BAND_FILL.poor;

  const incomplete = snapshot?.isComplete === false;
  const bandLabel = incomplete
    ? "Incomplete submission. PSQI items 1 to 9 are required for scoring"
    : band === "good"
      ? "Lower burden (global ≤5)"
      : band === "moderate"
        ? "Moderate burden (6 to 10)"
        : band === "poor"
          ? "Higher burden (≥11)"
          : "Complete PSQI questions 1 to 9 to compute";

  const tooltipLayout = useMemo(() => {
    if (
      focusedDomainId === null ||
      domainRowMetrics === null ||
      !domainColLayouts[focusedDomainId]
    ) {
      return null;
    }
    const { x, width } = domainColLayouts[focusedDomainId]!;
    const rowW = domainRowMetrics.width;
    const cx = x + width / 2;
    let left = cx - PSQI_DOMAIN_TOOLTIP_W / 2;
    const clampPad = 2;
    left = Math.max(
      clampPad,
      Math.min(left, rowW - PSQI_DOMAIN_TOOLTIP_W - clampPad),
    );
    return { left, top: domainRowMetrics.height + 8 };
  }, [focusedDomainId, domainRowMetrics, domainColLayouts]);

  const domainTooltipCopy = useMemo(() => {
    if (focusedDomainId === null) return null;
    const id = focusedDomainId;
    const shortTag = DOMAIN_MICRO[id];
    const full =
      snapshot?.domainById[id]?.label ?? PSQI_DOMAIN_LABELS[id];
    const s = snapshot?.domainById[id]?.score;

    let scoreLine: string;
    if (!snapshot) {
      scoreLine =
        "Complete PSQI once to see a scored value (0–3) for each component.";
    } else if (
      snapshot.isComplete !== true ||
      s === null ||
      s === undefined
    ) {
      scoreLine =
        "Scores appear when your PSQI is complete and items 1–9 are valid.";
    } else {
      scoreLine = `Component score ${String(s)} of 3. Lower is less burden here; higher reflects more burden in this part of PSQI.`;
    }

    const abbrLine = `${shortTag} is short for "${full}". Each block lights when your score is higher than that step (scores are 0 to 3; more blocks mean more burden here).`;

    return { full, scoreLine, abbrLine, shortTag };
  }, [focusedDomainId, snapshot]);

  const onDomainRowLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDomainRowMetrics((prev) =>
      prev?.width === width && prev?.height === height
        ? prev
        : { width, height },
    );
  }, []);

  const onDomainPress = useCallback((id: PsqiDomainId) => {
    setFocusedDomainId((prev) => (prev === id ? null : id));
  }, []);

  const onDomainHoverIn = useCallback((id: PsqiDomainId) => {
    if (Platform.OS === "web") setFocusedDomainId(id);
  }, []);

  const onDomainHoverOut = useCallback(() => {
    if (Platform.OS === "web") setFocusedDomainId(null);
  }, []);

  return (
    <View accessibilityRole="summary" style={styles.card}>
      <Pressable
        accessibilityHint="Opens a detailed guide to PSQI and how your score is calculated"
        accessibilityLabel="PSQI sleep quality. Open guide"
        accessibilityRole="button"
        android_ripple={{ color: "rgba(15,23,42,0.06)", foreground: false }}
        onPress={openModal}
        style={({ pressed }) => [styles.chromePressable, pressed && { opacity: 0.94 }]}
      >
        <View style={styles.headerStack}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerLeft}>
              <Ionicons color={colors.chartCardTitle} name="moon-outline" size={20} />
              <Text style={[typography.title, styles.headerTitle]}>PSQI sleep quality</Text>
            </View>
            <Ionicons
              accessibilityElementsHidden
              color={CARD.muted}
              importantForAccessibility="no"
              name="information-circle-outline"
              size={20}
            />
          </View>
          <Text style={[styles.captionMetaBelow, typography.micro]}>
            0 to 21 · lower is better
          </Text>
        </View>
        <Text style={[styles.subcaption, typography.caption]}>
          Pittsburgh Sleep Quality Index: arc shows your latest global score; grid shows burden in each PSQI domain (scores 0 to 3 per domain).
        </Text>
        {submittedLine ? (
          <Text style={[styles.submittedStamp, typography.micro]}>Submitted {submittedLine}</Text>
        ) : (
          <Text style={[styles.submittedMuted, typography.micro]}>
            Complete PSQI to see your sleep quality profile.
          </Text>
        )}
      </Pressable>

      <Text style={[styles.chartHint, typography.caption]}>
        Tap the header for a full PSQI guide, scoring details, and your latest breakdown (when available).
      </Text>

      <Pressable
        accessibilityHint="Opens PSQI score history"
        accessibilityLabel="PSQI sleep quality gauge. Open history"
        accessibilityRole="button"
        disabled={history.length === 0}
        onPress={() => setHistoryOpen(true)}
        style={({ pressed }) => [
          styles.gaugeWrap,
          history.length > 0 && pressed && { opacity: 0.94 },
        ]}
      >
        <AnimatedArcGauge
          animateKey={animateKey}
          childrenDefs={
            <>
              <SvgLinearGradient id="psqiGaugeGood" x1="0%" x2="100%" y1="0%" y2="0%">
                <Stop offset="0%" stopColor="#10B981" />
                <Stop offset="100%" stopColor="#059669" />
              </SvgLinearGradient>
              <SvgLinearGradient id="psqiGaugePoor" x1="0%" x2="100%" y1="0%" y2="0%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#DC2626" />
              </SvgLinearGradient>
            </>
          }
          knobColor={knobColor}
          layout={{ h: 132, cyOffset: 8, r: 96 }}
          maxValue={PSQI_GLOBAL_MAX}
          strokeLinecap="butt"
          tickTotals={[5, 10, 15]}
          trackStroke={CARD.track}
          value={total}
          valueStroke={total !== null ? valueStroke : undefined}
        />
        <View style={styles.gaugeCenter}>
          <Text style={styles.scoreHuge}>
            {total !== null ? String(total) : "n/a"}
          </Text>
          <Text style={[styles.bandTag, typography.micro]}>{bandLabel}</Text>
        </View>
      </Pressable>

      <View
        style={[
          styles.domainSection,
          tooltipLayout !== null && styles.domainSectionWithTooltip,
        ]}
      >
        <Text style={[styles.sectionEyebrow, typography.micro]}>
          Seven PSQI domains
        </Text>
        <Text style={[styles.domainHint, typography.caption]}>
          Tap a column for its full name and score. On web, you can hover as well.
        </Text>

        <View style={styles.domainRow} onLayout={onDomainRowLayout}>
          {PSQI_DOMAIN_ORDER.map((id) => {
            const slice = snapshot?.domainById[id];
            const s = slice?.score;
            const tint = PSQI_DOMAIN_ACCENT[id];
            const fullName =
              snapshot?.domainById[id]?.label ?? PSQI_DOMAIN_LABELS[id];
            const a11ySuffix =
              snapshot?.isComplete === true &&
              slice?.score !== null &&
              slice?.score !== undefined
                ? `. Score ${String(slice.score)} of 3`
                : ". Tap for details.";
            return (
              <Pressable
                accessibilityHint="Shows spelling of the abbreviation plus your scored component."
                accessibilityLabel={`${DOMAIN_MICRO[id]}: ${fullName}${a11ySuffix}`}
                accessibilityRole="button"
                hitSlop={6}
                key={id}
                onHoverIn={() => onDomainHoverIn(id)}
                onHoverOut={onDomainHoverOut}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  setDomainColLayouts((prev) => ({
                    ...prev,
                    [id]: { x, width },
                  }));
                }}
                onPress={() => onDomainPress(id)}
                android_ripple={{ color: "rgba(15,23,42,0.08)" }}
                style={({ pressed }) => [
                  styles.domainCol,
                  focusedDomainId === id && styles.domainColFocused,
                  pressed && styles.domainColPressed,
                ]}
              >
                <Text
                  style={[styles.domainAbbr, typography.micro, { color: tint }]}
                >
                  {DOMAIN_MICRO[id]}
                </Text>
                <View style={styles.stackTrack}>
                  {[0, 1, 2].map((tier) => {
                    const filled =
                      s !== null && s !== undefined && s > tier;
                    return (
                      <AnimatedStackSegment
                        animateKey={animateKey}
                        color={tint}
                        delayMs={PSQI_DOMAIN_ORDER.indexOf(id) * 70 + tier * 90}
                        filled={filled}
                        key={tier}
                      />
                    );
                  })}
                </View>
              </Pressable>
            );
          })}

          {tooltipLayout !== null && domainTooltipCopy !== null ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              pointerEvents="none"
              style={[
                styles.domainTooltip,
                {
                  left: tooltipLayout.left,
                  top: tooltipLayout.top,
                  width: PSQI_DOMAIN_TOOLTIP_W,
                },
              ]}
            >
              <Text numberOfLines={3} style={styles.domainTooltipTitle}>
                {domainTooltipCopy.full}
              </Text>
              <Text style={styles.domainTooltipScore}>
                {domainTooltipCopy.scoreLine}
              </Text>
              <Text style={styles.domainTooltipAbbr}>
                {domainTooltipCopy.abbrLine}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={[styles.footerNote, typography.caption]}>
        Reference cutoffs commonly used in research: global total ≤5 suggests “good” sleep quality; &gt;5 suggests poor
        sleep quality overall.
      </Text>

      <PsqiEducationModal
        onClose={() => setModalOpen(false)}
        snapshot={snapshot}
        visible={modalOpen}
      />
      <ClinicalHistoryModal
        caption="Global PSQI total over past submissions. Lower scores generally mean less sleep burden."
        gradientId="psqiHistoryStroke"
        lineColor={colors.primary}
        lowerIsBetter
        maxValue={PSQI_GLOBAL_MAX}
        onClose={() => setHistoryOpen(false)}
        points={history}
        subtitle="PSQI history"
        title="Sleep quality trend"
        visible={historyOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: 22,
    backgroundColor: colors.chartCard,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    paddingHorizontal: 18,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md + 4,
    gap: spacing.sm + 2,
    marginBottom: spacing.xxl,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: "visible",
  },
  chromePressable: {
    borderRadius: 14,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingBottom: spacing.xs + 2,
    gap: spacing.sm + 2,
  },
  chartHint: {
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: "500",
  },
  headerStack: {
    alignSelf: "stretch",
    gap: spacing.xs + 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    flexShrink: 1,
  },
  headerTitle: {
    color: colors.chartCardTitle,
    letterSpacing: -0.35,
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
  },
  captionMetaBelow: {
    color: CARD.muted,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    textAlign: "left",
  },
  subcaption: {
    color: CARD.muted,
    fontWeight: "500",
    lineHeight: 20,
  },
  submittedStamp: {
    color: CARD.fg,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.35,
    marginTop: 2,
    marginBottom: 2,
  },
  submittedMuted: {
    color: CARD.muted,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "500",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 2,
  },
  gaugeWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    position: "relative",
    minHeight: 150,
  },
  gaugeCenter: {
    position: "absolute",
    bottom: 8,
    alignItems: "center",
    width: "100%",
    pointerEvents: "none",
  },
  scoreHuge: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: CARD.fg,
    fontVariant: ["tabular-nums"],
  },
  bandTag: {
    marginTop: 2,
    color: CARD.muted,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 240,
    letterSpacing: 0.25,
  },
  sectionEyebrow: {
    color: CARD.muted,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 1.05,
  },
  domainSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    overflow: "visible",
  },
  domainSectionWithTooltip: {
    paddingBottom: 116,
    zIndex: 2,
  },
  domainHint: {
    color: colors.textMuted,
    fontWeight: "500",
    lineHeight: 18,
  },
  domainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: 2,
    position: "relative",
    overflow: "visible",
  },
  domainCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
  },
  domainColFocused: {
    backgroundColor: colors.primarySoft,
  },
  domainColPressed:
    Platform.OS === "ios" ? { opacity: 0.92 } : { opacity: 1 },
  domainTooltip: {
    position: "absolute",
    zIndex: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(12,35,64,0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  domainTooltipTitle: {
    color: CARD.fg,
    fontFamily: typography.title.fontFamily,
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
  },
  domainTooltipScore: {
    color: colors.textSecondary,
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.xs + 2,
  },
  domainTooltipAbbr: {
    color: colors.textMuted,
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    marginTop: spacing.sm,
  },
  domainAbbr: {
    fontWeight: "800",
    letterSpacing: 0.35,
    textAlign: "center",
  },
  stackTrack: {
    width: "100%",
    maxWidth: 38,
    gap: 3,
    alignSelf: "center",
  },
  footerNote: {
    color: colors.textMuted,
    lineHeight: 18,
    fontWeight: "500",
    marginTop: spacing.xs + 4,
  },
});

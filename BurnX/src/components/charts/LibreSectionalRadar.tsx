import { Ionicons } from "@expo/vector-icons";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type {
  LibreDashboardSubmissionSnapshot,
  LibreRadarDomainSlice,
  LibreRadarSectionId,
} from "../../lib/libre-scoring";
import {
  LIBRE_RADAR_AXIS_SHORT,
  LIBRE_RADAR_SECTION_ORDER,
} from "../../lib/libre-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { LibreDomainBarBreakdownModal } from "./LibreDomainBarBreakdownModal";

const AXES = 6;
const GRID_RINGS = 6;
/** Keep ring radii & stroke circles valid — label margin is capped so outerR stays ≥ this. */
const RADAR_MIN_OUTER_R = 8;
const BASELINE_T = 50;
const HIT = 44;
const TOOLTIP_W = 216;

const BRAVO = {
  foreground: "#0C2340",
  cognitive: "#4F6CFF",
  groupedSurface: "#EFEFF4",
  cardStroke: "rgba(12, 35, 64, 0.04)",
  gridStroke: "rgba(12, 35, 64, 0.15)",
  baselineStroke: "rgba(12, 35, 64, 0.55)",
  captionSecondary: "rgba(12, 35, 64, 0.55)",
};

function formatLibreSubmitted(iso: string | null): string | null {
  if (iso === null || typeof iso !== "string" || iso.trim() === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function axisAngleRadians(axisIndex: number): number {
  return -Math.PI / 2 + (axisIndex * 2 * Math.PI) / AXES;
}

function radarPoint(
  cx: number,
  cy: number,
  r: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function radiusFromTScore(
  tScore: number | null,
  outerR: number,
  rMinRatio: number,
): number {
  if (tScore === null) return outerR * rMinRatio;
  const t = Math.max(20, Math.min(80, tScore));
  const u = (t - 20) / 60;
  return outerR * (rMinRatio + u * (1 - rMinRatio));
}

function polygonPathFromScores(
  cx: number,
  cy: number,
  outerR: number,
  rMinRatio: number,
  tAccessor: (axisIndex: number) => number | null,
): string {
  const pts: string[] = [];
  for (let i = 0; i < AXES; i += 1) {
    const a = axisAngleRadians(i);
    const r = radiusFromTScore(tAccessor(i), outerR, rMinRatio);
    const { x, y } = radarPoint(cx, cy, r, a);
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return `${pts.join(" ")} Z`;
}

type LibreSectionalRadarProps = {
  domains: LibreRadarDomainSlice[];
  overallTScore: number | null;
  submittedAtIso: string | null;
  /** Newest-first; home radar uses [0]; modal can page through all */
  libreSubmissionHistory: LibreDashboardSubmissionSnapshot[];
};

export function LibreSectionalRadar({
  domains,
  overallTScore: _overallTScore,
  submittedAtIso,
  libreSubmissionHistory,
}: LibreSectionalRadarProps) {
  const submittedLine = useMemo(
    () => formatLibreSubmitted(submittedAtIso),
    [submittedAtIso],
  );

  const orderDomains = useMemo(() => {
    const byId = Object.fromEntries(
      domains.map((d) => [d.sectionId, d]),
    ) as Record<LibreRadarSectionId, LibreRadarDomainSlice | undefined>;
    return LIBRE_RADAR_SECTION_ORDER.map(
      (sid) =>
        byId[sid] ?? {
          sectionId: sid,
          label: sid,
          tScore: null,
          filledBands: 0,
        },
    );
  }, [domains]);

  const [plotPx, setPlotPx] = useState(0);
  const [chartBox, setChartBox] = useState({ width: 0, height: 0 });
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [focusFromPill, setFocusFromPill] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const revealed = useSharedValue(0);

  useEffect(() => {
    revealed.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [revealed]);

  const plotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(revealed.value, [0, 0.1, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(revealed.value, [0, 1], [0.05, 1]) }],
  }));

  const onChartLayout = useCallback((ev: LayoutChangeEvent) => {
    const { width, height } = ev.nativeEvent.layout;
    const floored = Math.max(PixelRatio.roundToNearestPixel(width), 1);
    setChartBox({
      width: floored,
      height: PixelRatio.roundToNearestPixel(height) || floored,
    });
    setPlotPx(floored);
  }, []);

  const geo = useMemo(() => {
    const wInner = plotPx > 0 ? plotPx : 284;
    const cxI = wInner / 2;
    const cyI = wInner / 2;
    const half = wInner / 2;
    const labelMarginDesired = Math.max(52, Math.min(82, Math.round(wInner * 0.174)));
    const labelMarginCap = Math.max(0, half - RADAR_MIN_OUTER_R);
    const labelMargin = Math.min(labelMarginDesired, labelMarginCap);
    const outerRI = Math.max(RADAR_MIN_OUTER_R, half - labelMargin);
    const innerRG = outerRI * 0.08;
    const rMin =
      outerRI > 0.001
        ? Math.max(0.1, innerRG / outerRI + 0.035)
        : 0.12;
    return {
      w: wInner,
      cx: cxI,
      cy: cyI,
      outerR: outerRI,
      innerRGrid: innerRG,
      rMinRatio: rMin,
    };
  }, [plotPx]);

  const { w, cx, cy, outerR, innerRGrid, rMinRatio } = geo;

  const baselinePath = useMemo(
    () =>
      polygonPathFromScores(cx, cy, outerR, rMinRatio, (_axis) => BASELINE_T),
    [cx, cy, outerR, rMinRatio],
  );

  const currentPath = useMemo(
    () =>
      polygonPathFromScores(cx, cy, outerR, rMinRatio, (i) =>
        orderDomains[i] ? orderDomains[i].tScore : null),
    [cx, cy, outerR, rMinRatio, orderDomains],
  );

  const scale = chartBox.width > 0 ? chartBox.width / w : 0;
  const dotR = Math.max(5, PixelRatio.roundToNearestPixel(w * 0.018));

  const gridRings: ReactElement[] = [];
  for (let k = 1; k <= GRID_RINGS; k += 1) {
    const rk = innerRGrid + ((outerR - innerRGrid) * k) / GRID_RINGS;
    gridRings.push(
      <Circle
        cx={cx}
        cy={cy}
        fill="none"
        key={`rg-${k}`}
        r={rk}
        stroke={BRAVO.gridStroke}
        strokeWidth={k === GRID_RINGS ? 1.35 : 0.92}
      />,
    );
  }

  const spokes: ReactElement[] = [];
  for (let i = 0; i < AXES; i += 1) {
    const a = axisAngleRadians(i);
    const outer = radarPoint(cx, cy, outerR, a);
    const inner = radarPoint(cx, cy, innerRGrid, a);
    spokes.push(
      <Line
        key={`sp-${i}`}
        stroke={BRAVO.gridStroke}
        strokeWidth={1}
        x1={inner.x}
        x2={outer.x}
        y1={inner.y}
        y2={outer.y}
      />,
    );
  }

  const capsuleFont = Math.max(10, Math.min(11, Math.round(w * 0.034)));
  const capsuleH = 19;
  const pillR = outerR + capsuleH / 2 + 6;

  const capsuleNodes = LIBRE_RADAR_SECTION_ORDER.map((sid) => {
    const text = LIBRE_RADAR_AXIS_SHORT[sid] ?? "n/a";
    const i = LIBRE_RADAR_SECTION_ORDER.indexOf(sid);
    const ang = axisAngleRadians(i);
    const lx = cx + pillR * Math.cos(ang);
    const ly = cy + pillR * Math.sin(ang);
    const tw = Math.max(
      capsuleH + 6,
      text.length * capsuleFont * 0.62 + spacing.sm + 10,
    );
    return (
      <G key={`pill-${sid}`}>
        <Rect
          fill={BRAVO.groupedSurface}
          height={capsuleH}
          rx={capsuleH / 2}
          ry={capsuleH / 2}
          stroke="rgba(12,35,64,0.06)"
          strokeWidth={1}
          width={tw}
          x={lx - tw / 2}
          y={ly - capsuleH / 2}
        />
        <SvgText
          fill={BRAVO.foreground}
          fontFamily={typography.micro.fontFamily}
          fontSize={capsuleFont}
          fontWeight="700"
          letterSpacing={0.35}
          textAnchor="middle"
          x={lx}
          y={ly + capsuleFont * 0.35}
        >
          {text}
        </SvgText>
      </G>
    );
  });

  const clearFocus = useCallback(() => {
    setFocusedIdx(null);
    setFocusFromPill(false);
  }, []);
  const setDotFocus = useCallback((idx: number | null) => {
    setFocusFromPill(false);
    setFocusedIdx(idx);
  }, []);
  const setPillFocus = useCallback((idx: number | null) => {
    setFocusFromPill(idx !== null);
    setFocusedIdx(idx);
  }, []);

  const openModal = useCallback(() => {
    if (libreSubmissionHistory.length === 0) return;
    setModalOpen(true);
    clearFocus();
  }, [clearFocus, libreSubmissionHistory.length]);

  const tipLayout = useMemo(() => {
    if (focusedIdx === null || scale <= 0) return null;
    const idx = focusedIdx;
    const ds = orderDomains[idx];
    const title = ds.label;
    const scoreText =
      ds.tScore !== null
        ? `Approx. T-score: ${Math.round(ds.tScore * 10) / 10}`
        : "No scorable items in this section yet.";

    let px: number;
    let py: number;
    if (focusFromPill) {
      const ang = axisAngleRadians(idx);
      const lx = cx + pillR * Math.cos(ang);
      const ly = cy + pillR * Math.sin(ang);
      px = lx * scale;
      py = ly * scale;
    } else {
      const ang = axisAngleRadians(idx);
      const rPt = radarPoint(
        cx,
        cy,
        radiusFromTScore(ds.tScore, outerR, rMinRatio),
        ang,
      );
      px = rPt.x * scale;
      py = rPt.y * scale;
    }

    const rScaled = dotR * scale;
    const margin = 10;
    let left = px - TOOLTIP_W / 2;
    let top = py - rScaled - 12 - 72;
    if (top < margin) top = py + rScaled + 12;
    if (left < margin) left = margin;
    if (left + TOOLTIP_W > chartBox.width - margin) {
      left = chartBox.width - TOOLTIP_W - margin;
    }
    return { left, top, title, scoreText };
  }, [
    focusedIdx,
    focusFromPill,
    orderDomains,
    scale,
    cx,
    cy,
    pillR,
    outerR,
    rMinRatio,
    dotR,
    chartBox.width,
  ]);

  const canOpenDetail = libreSubmissionHistory.length > 0;

  return (
    <View accessibilityRole="none" style={styles.card}>
      <Pressable
        accessibilityHint={
          canOpenDetail
            ? "Opens a breakdown of approximate scores by section for this snapshot"
            : undefined
        }
        accessibilityLabel="LIBRE card header. Open sectional breakdown"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canOpenDetail }}
        android_ripple={
          canOpenDetail ? { color: "rgba(12,35,64,0.08)", foreground: false } : undefined
        }
        disabled={!canOpenDetail}
        onPress={openModal}
        style={({ pressed }) => [
          styles.chromePressable,
          canOpenDetail && pressed && { opacity: 0.94 },
        ]}
      >
        <View style={styles.headerStack}>
          <View style={styles.headerLeft}>
            <Ionicons color={colors.chartCardTitle} name="apps-outline" size={20} />
            <Text style={[typography.title, styles.headerTitle]}>
              LIBRE domain profile
            </Text>
          </View>
          <Text style={[styles.captionMetaBelow, typography.micro]}>Now vs baseline</Text>
        </View>
        <Text style={[styles.subcaption, typography.caption]}>
          Life Impact Burn Recovery Evaluation: shaded area shows your latest submission versus a
          midpoint reference (approx. T-score {BASELINE_T}).
        </Text>
        {submittedLine ? (
          <Text style={[styles.submittedStamp, typography.micro]}>
            Submitted {submittedLine}
          </Text>
        ) : (
          <Text style={[styles.submittedMuted, typography.micro]}>
            Submission time will appear once a LIBRE questionnaire is on record.
          </Text>
        )}
      </Pressable>

      <View onLayout={onChartLayout} style={styles.plotOuter}>
        <Animated.View style={[styles.plotInnerFill, plotAnimatedStyle]}>
          <Svg
            height="100%"
            pointerEvents="none"
            style={styles.plotSvgLayer}
            viewBox={`0 0 ${w} ${w}`}
            width="100%"
          >
            <Defs>
              <LinearGradient
                gradientUnits="objectBoundingBox"
                id="radarCurrentFillGradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <Stop offset="0" stopColor={BRAVO.cognitive} stopOpacity={0.55} />
                <Stop offset="1" stopColor={BRAVO.cognitive} stopOpacity={0.18} />
              </LinearGradient>
            </Defs>
            <G>{gridRings}</G>
            <G>{spokes}</G>
            <Path
              d={baselinePath}
              fill="none"
              stroke={BRAVO.baselineStroke}
              strokeDasharray="8 9"
              strokeLinecap="round"
              strokeWidth={2}
            />
            <Path
              d={currentPath}
              fill="url(#radarCurrentFillGradient)"
              stroke={BRAVO.cognitive}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            {LIBRE_RADAR_SECTION_ORDER.map((sid, idx) => {
              const ds = orderDomains[idx];
              const ang = axisAngleRadians(idx);
              const rPt = radarPoint(
                cx,
                cy,
                radiusFromTScore(ds.tScore, outerR, rMinRatio),
                ang,
              );
              return (
                <Circle
                  cx={rPt.x}
                  cy={rPt.y}
                  fill={BRAVO.cognitive}
                  key={`vd-${sid}`}
                  stroke={colors.white}
                  strokeWidth={2}
                  r={dotR}
                />
              );
            })}
            <G>{capsuleNodes}</G>
          </Svg>

          {scale > 0
            ? LIBRE_RADAR_SECTION_ORDER.map((sid, idx) => {
                const ang = axisAngleRadians(idx);
                const lx = cx + pillR * Math.cos(ang);
                const ly = cy + pillR * Math.sin(ang);
                const text = LIBRE_RADAR_AXIS_SHORT[sid] ?? "n/a";
                const tw = Math.max(
                  capsuleH + 6,
                  text.length * capsuleFont * 0.62 + spacing.sm + 10,
                );
                const hitW = Math.max(tw + 12, HIT);
                const hitH = Math.max(capsuleH + 12, HIT);
                return (
                  <Pressable
                    key={`pill-hit-${sid}`}
                    onHoverIn={() => setPillFocus(idx)}
                    onHoverOut={() => setPillFocus(null)}
                    onPress={() => {
                      setFocusFromPill(true);
                      setFocusedIdx((prev) => (prev === idx ? null : idx));
                    }}
                    style={[
                      styles.hitPill,
                      {
                        left: lx * scale - hitW / 2,
                        top: ly * scale - hitH / 2,
                        width: hitW,
                        height: hitH,
                      },
                    ]}
                  />
                );
              })
            : null}

          {scale > 0
            ? LIBRE_RADAR_SECTION_ORDER.map((sid, idx) => {
                const ds = orderDomains[idx];
                const ang = axisAngleRadians(idx);
                const rPt = radarPoint(
                  cx,
                  cy,
                  radiusFromTScore(ds.tScore, outerR, rMinRatio),
                  ang,
                );
                return (
                  <Pressable
                    key={`dot-hit-${sid}`}
                    onHoverIn={() => setDotFocus(idx)}
                    onHoverOut={() => setDotFocus(null)}
                    onPress={() => {
                      setFocusFromPill(false);
                      setFocusedIdx((prev) => (prev === idx ? null : idx));
                    }}
                    style={[
                      styles.hitDot,
                      {
                        left: rPt.x * scale - HIT / 2,
                        top: rPt.y * scale - HIT / 2,
                      },
                    ]}
                  />
                );
              })
            : null}

          {tipLayout !== null ? (
            <View
              accessibilityLabel={`${tipLayout.title}. ${tipLayout.scoreText}`}
              accessibilityRole="text"
              accessibilityViewIsModal
              pointerEvents="none"
              style={[
                styles.tooltipBox,
                { left: tipLayout.left, top: tipLayout.top, width: TOOLTIP_W },
              ]}
            >
              <Text numberOfLines={2} style={styles.tooltipTitle}>
                {tipLayout.title}
              </Text>
              <Text style={styles.tooltipScore}>{tipLayout.scoreText}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      <Text style={[styles.chartHint, typography.caption]}>
        Tap labels or dots for quick scores.{" "}
        {canOpenDetail
          ? "Use the header area above for a full sectional breakdown."
          : "Complete LIBRE to unlock the sectional breakdown."}
      </Text>

      <LibreDomainBarBreakdownModal
        history={libreSubmissionHistory}
        onClose={() => setModalOpen(false)}
        visible={modalOpen}
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
    borderColor: "rgba(15, 23, 42, 0.08)",
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
  headerStack: {
    alignSelf: "stretch",
    gap: spacing.xs + 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    flexShrink: 1,
    alignSelf: "flex-start",
    flexWrap: "wrap",
  },
  headerTitle: {
    color: colors.chartCardTitle,
    letterSpacing: -0.35,
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 1,
  },
  captionMetaBelow: {
    color: BRAVO.captionSecondary,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    textAlign: "left",
  },
  subcaption: {
    color: BRAVO.captionSecondary,
    fontWeight: "500",
    lineHeight: 20,
  },
  submittedStamp: {
    color: BRAVO.foreground,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "600",
    letterSpacing: 0.35,
    marginTop: 2,
    marginBottom: 2,
  },
  submittedMuted: {
    color: BRAVO.captionSecondary,
    fontFamily: typography.micro.fontFamily,
    fontWeight: "500",
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 2,
  },
  chromePressable: {
    borderRadius: 14,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    paddingBottom: spacing.xs + 2,
    gap: spacing.sm + 2,
  },
  plotOuter: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    marginTop: spacing.xs,
  },
  plotInnerFill: {
    ...StyleSheet.absoluteFillObject,
  },
  plotSvgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  hitPill: {
    position: "absolute",
    zIndex: 2,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    /* Expands touch targets without visible chrome */
  },
  hitDot: {
    position: "absolute",
    zIndex: 3,
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  tooltipBox: {
    position: "absolute",
    zIndex: 5,
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
  tooltipTitle: {
    color: BRAVO.foreground,
    fontFamily: typography.title.fontFamily,
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  tooltipScore: {
    color: BRAVO.captionSecondary,
    fontFamily: typography.caption.fontFamily,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  chartHint: {
    color: colors.textMuted,
    marginTop: spacing.xs + 4,
    lineHeight: 18,
    fontWeight: "500",
  },
});

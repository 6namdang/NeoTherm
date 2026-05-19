/**
 * Reference sheet for PROMIS Pain Intensity 3a home card plus optional snapshot.
 */

import { Ionicons } from "@expo/vector-icons";
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
import type {
  PainIntensityDashboardSnapshot,
  PainIntensityDashboardPoint,
  PainIntensitySeverity,
} from "../../lib/pain-intensity-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const NAVY = "#0F172A";
const SURFACE = "#F9FAFB";
const STROKE = "rgba(15, 23, 42, 0.08)";

const SEVERITY_LABEL: Record<PainIntensitySeverity, string> = {
  none: "None (below illustrative cutoffs)",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  snapshot: PainIntensityDashboardSnapshot | null;
  /** Newest ordinal row (typically `history[0]`) so the modal can list worst/average/current. */
  latestOrdinal?: PainIntensityDashboardPoint | null;
};

function formatSubmitted(iso: string | null): string | null {
  if (iso === null || typeof iso !== "string" || iso.trim() === "") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function lvlLabel(name: string, v: number | null): string {
  if (v === null) return `${name}: n/a`;
  return `${name}: ${String(v)} of 4 (0 lowest pain intensity wording, 4 highest)`;
}

export function PainIntensityEducationModal({
  visible,
  onClose,
  snapshot,
  latestOrdinal,
}: Props) {
  const insets = useSafeAreaInsets();
  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

  const submitted = snapshot ? formatSubmitted(snapshot.createdAtIso) : null;
  const complete =
    snapshot?.isComplete === true &&
    snapshot.tScore !== null &&
    snapshot.standardError !== null;

  const body = (
    <View
      style={[
        styles.contentRoot,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          paddingTop:
            Platform.OS === "ios" ? insets.top + 8 : spacing.md + 10,
        },
      ]}
    >
      <View style={styles.sheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTitles}>
            <Text style={[typography.title, styles.modalTitle]}>
              About PROMIS Pain Intensity 3a
            </Text>
            <Text style={[typography.caption, styles.modalSub]}>
              Your home T-score averages three pain intensity prompts; tap the chart area elsewhere for trend view of reported average intensity over time (0 to 4 scale).
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.72 },
            ]}
          >
            <Ionicons color={colors.textMuted} name="close" size={26} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {snapshot && complete ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>
                Your latest snapshot
              </Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>
                  {submitted}
                </Text>
              ) : null}
                  <Text style={[typography.title, styles.snapshotTotal]}>
                    T-score: {Math.round(snapshot.tScore! * 10) / 10}
                    {snapshot.severity
                      ? ` · ${SEVERITY_LABEL[snapshot.severity]}`
                      : ""}
                  </Text>
              <Text style={[typography.caption, styles.snapshotBand]}>
                PROMIS summed item metric (contributions run 1 to 5 from each ordinal index) yielded raw{" "}
                {snapshot.rawScore ?? "n/a"}
                . Estimated standard error for the T-score: ±
                {Math.round(snapshot.standardError! * 10) / 10}.
              </Text>
              {latestOrdinal?.isComplete ? (
                <>
                  <Text style={[typography.micro, styles.itemEyebrow]}>
                    Item levels (research presentation)
                  </Text>
                  <Text style={[typography.caption, styles.itemLine]}>
                    {lvlLabel("Worst", latestOrdinal.worst0to4)}
                  </Text>
                  <Text style={[typography.caption, styles.itemLine]}>
                    {lvlLabel("Average", latestOrdinal.average0to4)}
                  </Text>
                  <Text style={[typography.caption, styles.itemLine]}>
                    {lvlLabel("Current", latestOrdinal.current0to4)}
                  </Text>
                </>
              ) : null}
            </View>
          ) : snapshot ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>
                Submission needs attention
              </Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>
                  {submitted}
                </Text>
              ) : null}
              <Text style={[typography.body, styles.snapshotBody]}>
                All three PROMIS Pain Intensity prompts need valid categorical
                selections before BurnX can publish your T-score. If you believe your
                answers were complete but scoring still fails, contact your clinician
                before acting on provisional numbers alone.
              </Text>
            </View>
          ) : (
            <Text style={[typography.caption, styles.mutedBlock]}>
              After you submit the PROMIS Pain Intensity 3a check-in successfully, identical T-score, band, and item breakdown show here whenever you revisit this modal.
            </Text>
          )}

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Average pain timeline (different sheet)
          </Text>
          <Text style={[typography.caption, styles.para]}>
            The history modal emphasizes the response to average pain wording as a smoothed ordinal track (levels 0 to 4 across dates). PROMIS converts the latest triple of endorsed categories into the PROMIS calibration T-score you see prominently on your home banner; interpretations differ intentionally between those views.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>T-score bar</Text>
          <Text style={[typography.caption, styles.para]}>
            Bars span roughly PROMIS-published short-form extremes (approximately T = 30 to 85 in this rendition). Severity ticks at 55, 60, and 70 follow common illustrative cut-points on the PROMIS pain intensity continuum; clinicians may apply different individualized targets.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Disclaimer</Text>
          <Text style={[typography.caption, styles.para]}>
            None of BurnX PROMIS overlays replace clinical judgement. Pain metrics fluctuate naturally; escalate concerning patterns with professionals who supervise your pharmacologic therapy and escalation plans.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Reference</Text>
          <Text style={[typography.caption, styles.para, styles.reference]}>
            PROMIS Pain Intensity Adult 3a v2 scoring table and methodological notes reside in HealthMeasures PROMIS manuals (Pain Intensity Scoring Manual, June 2021 revision onward).
          </Text>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </View>
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
          <View style={styles.androidSheet}>{body}</View>
        </View>
      ) : (
        <View style={styles.iosWrap}>{body}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentRoot: {
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
    paddingHorizontal: spacing.lg + 4,
    flexShrink: 1,
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modalHeaderTitles: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  modalTitle: {
    color: NAVY,
    letterSpacing: -0.35,
  },
  modalSub: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  closeBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
  },
  scroll: {
    maxHeight: 560,
    alignSelf: "stretch",
  },
  snapshotCard: {
    backgroundColor: SURFACE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  snapshotEyebrow: {
    color: colors.textMuted,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  snapshotTime: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  snapshotBody: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  snapshotTotal: {
    color: NAVY,
    marginTop: spacing.xs,
  },
  snapshotBand: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  itemEyebrow: {
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  itemLine: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  mutedBlock: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    fontWeight: "500",
  },
  sectionEyebrow: {
    color: colors.textMuted,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 1.05,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  para: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  reference: {
    fontStyle: "italic",
    color: colors.textMuted,
  },
});

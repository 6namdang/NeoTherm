/**
 * Reference sheet for PROMIS Fatigue 7a home card plus optional snapshot.
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
import type { FatigueDashboardSnapshot, FatigueSeverity } from "../../lib/fatigue-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const NAVY = "#0F172A";
const SURFACE = "#F9FAFB";
const STROKE = "rgba(15, 23, 42, 0.08)";

const SEVERITY_LABEL: Record<FatigueSeverity, string> = {
  none: "None (below usual clinical thresholds on this metric)",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  snapshot: FatigueDashboardSnapshot | null;
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

export function FatigueEducationModal({ visible, onClose, snapshot }: Props) {
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
              About PROMIS Fatigue 7a
            </Text>
            <Text style={[typography.caption, styles.modalSub]}>
              How BurnX derives your PROMIS fatigue T-score, what the home scale shows, and what the numbers usually mean for self-monitoring.
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
          {snapshot ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>
                Your latest snapshot
              </Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>
                  {submitted}
                </Text>
              ) : null}
              {complete ? (
                <>
                  <Text style={[typography.title, styles.snapshotTotal]}>
                    T-score:{" "}
                    {Math.round(snapshot.tScore! * 10) / 10}
                    {" · "}
                    {snapshot.severity
                      ? SEVERITY_LABEL[snapshot.severity]
                      : ""}
                  </Text>
                  <Text style={[typography.caption, styles.snapshotBand]}>
                    Raw sum from seven valid responses:{" "}
                    {snapshot.rawScore ?? "n/a"}
                    . Standard error on the PROMIS metric (T): ±
                    {Math.round(snapshot.standardError! * 10) / 10}.
                  </Text>
                </>
              ) : (
                <Text style={[typography.body, styles.snapshotBody]}>
                  {snapshot.rawScore !== null &&
                  snapshot.rawScore !== undefined &&
                  snapshot.tScore === null
                    ? `Raw sum (${snapshot.rawScore}) did not match the published PROMIS Fatigue 7a table, or some answers were incomplete. Completing each item within allowed ranges usually restores scoring.`
                    : "Complete all seven PROMIS Fatigue items with valid responses so your T-score snapshot can populate here."}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[typography.caption, styles.mutedBlock]}>
              Complete the PROMIS Fatigue 7a form to see your T-score snapshot in this sheet and on your home dashboard.
            </Text>
          )}

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            T-score and scale (about 30 to 80)
          </Text>
          <Text style={[typography.caption, styles.para]}>
            The home card lays out the usual PROMIS short-form fatigue range used in many electronic tools (about T = 30 to 80). Higher values mean stronger self-reported fatigue than lower values for the population reference used when the PROMIS fatigue metric was normed. Fifty is often described roughly as average in the normed sample; dispersion is summarized with a standard deviation around ten T-score units in many PROMIS materials. This app uses the PROMIS-published conversion from your summed item scores to obtain T-score and standard error where all seven items qualify.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Severity shading (orienting cutoffs at 55, 60, 70)
          </Text>
          <Text style={[typography.caption, styles.para]}>
            The colored band beside your T-score and the ticks on the home bar reuse common illustrative cut-points on this metric (&lt;55 low concern in many clinic charts, mid ranges, ≥70 heavier burden). Labels are abbreviated for readability; BurnX treats them strictly as orientation, not diagnostic labels.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>
            Seven items on the PROMIS fatigue short form
          </Text>
          <Text style={[typography.caption, styles.para]}>
            Six items contribute their frequency answer as value (option index plus one on a 1 to 5 metric scale). Item 7 (energy compared to strenuous exercise you want to perform) contributes in the reverse direction in the PROMIS manuals (higher endorsed capability lowers fatigue contribution once converted). Answers must sit on permitted response indices for every item before the raw score can convert to your T-score and standard error shown on the dashboard.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Disclaimer</Text>
          <Text style={[typography.caption, styles.para]}>
            PROMIS summaries support communication with your clinicians; interpretations differ by condition and trajectory. Discuss persistent symptoms with your treating team rather than relying on this screen alone for medical decisions.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Reference</Text>
          <Text style={[typography.caption, styles.para, styles.reference]}>
            PROMIS Fatigue scoring is maintained by HealthMeasures; see PROMIS Fatigue User Manual / adult short-form 7a v1 conversion appendices published there for technical detail.
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

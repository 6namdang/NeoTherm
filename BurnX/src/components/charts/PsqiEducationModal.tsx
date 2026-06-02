/**
 * PSQI reference sheet. Clinical context, how NeoTherm scores the index, and optional “your snapshot” summary.
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
import { PSQI_DOMAIN_ACCENT } from "../../constants/psqi-chart-palette";
import {
  PSQI_DOMAIN_ORDER,
  psqiClinicalBand,
  type PsqiDashboardSubmissionSnapshot,
  type PsqiDomainId,
} from "../../lib/psqi-scoring";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const NAVY = "#0F172A";
const SURFACE = "#F9FAFB";
const STROKE = "rgba(15, 23, 42, 0.08)";

const DOMAIN_COPY: Record<
  PsqiDomainId,
  { title: string; body: string }
> = {
  durat: {
    title: "Sleep duration (DURAT)",
    body:
      "Summarizes how much you report sleeping. In the published PSQI this comes from self-reported hours of sleep; NeoTherm maps your answer category to the standard 0 to 3 duration component (higher = worse).",
  },
  distb: {
    title: "Sleep disturbance (DISTB)",
    body:
      "Reflects how often sleep was disturbed (waking, bathroom, breathing, temperature, pain, dreams, etc.). Nine frequency items are summed into bands (0 / 1 to 9 / 10 to 18 / >18) for a 0 to 3 component. “Other” reasons only count when a problem frequency is paired with a comment, per the 2005 Buysse scoring note.",
  },
  laten: {
    title: "Sleep latency (LATEN)",
    body:
      "Combines trouble falling asleep within 30 minutes with time-to-sleep category. The sum is bucketed into 0 to 3 (higher = longer sleep onset / more trouble).",
  },
  daydys: {
    title: "Daytime dysfunction (DAYDYS)",
    body:
      "Based on staying awake during activities and keeping up enthusiasm. The two items are summed and mapped to 0 to 3.",
  },
  hse: {
    title: "Sleep efficiency (HSE)",
    body:
      "Approximates the percentage of time in bed that you were actually asleep. NeoTherm estimates time in bed from your usual bed and wake time categories and compares that to your reported sleep hours, then applies the standard efficiency cutoffs (about ≥85% best, then mid ranges, then <65% worst).",
  },
  sq: {
    title: "Subjective sleep quality (SLPQUAL)",
    body: "Your overall sleep quality rating (Q6), scored 0 to 3 directly from the scale.",
  },
  meds: {
    title: "Sleep medications (MEDS)",
    body: "How often you used medicine to help you sleep (Q7), scored 0 to 3 directly from the scale.",
  },
};

type Props = {
  visible: boolean;
  onClose: () => void;
  snapshot: PsqiDashboardSubmissionSnapshot | null;
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

export function PsqiEducationModal({ visible, onClose, snapshot }: Props) {
  const insets = useSafeAreaInsets();
  const presentationStyle =
    Platform.OS === "ios" ? ("pageSheet" as const) : undefined;

  const total = snapshot?.total ?? null;
  const band = psqiClinicalBand(total);
  const submitted = snapshot ? formatSubmitted(snapshot.createdAtIso) : null;
  const incomplete = snapshot?.isComplete === false;

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
              About the PSQI
            </Text>
            <Text style={[typography.caption, styles.modalSub]}>
              Pittsburgh Sleep Quality Index: what the numbers mean in this app and how the home card is built.
            </Text>
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

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {(snapshot && (total !== null || incomplete)) ? (
            <View style={styles.snapshotCard}>
              <Text style={[typography.micro, styles.snapshotEyebrow]}>
                Your latest snapshot
              </Text>
              {submitted ? (
                <Text style={[typography.caption, styles.snapshotTime]}>{submitted}</Text>
              ) : null}
              {incomplete ? (
                <Text style={[typography.body, styles.snapshotBody]}>
                  This submission is missing some required items (PSQI questions 1 to 9). Finish the questionnaire for a full global score and domain breakdown.
                </Text>
              ) : total !== null ? (
                <>
                  <Text style={[typography.title, styles.snapshotTotal]}>
                    Global score: {total} / 21
                  </Text>
                  <Text style={[typography.caption, styles.snapshotBand]}>
                    {band === "good"
                      ? "Often interpreted as “good” sleep quality (total ≤5) in research settings."
                      : band === "moderate"
                        ? "Between common “good” and “poor” cutoffs (6 to 10)."
                        : "Often interpreted as “poor” sleep quality (≥11) in research settings."}
                  </Text>
                  <View style={styles.domainList}>
                    {PSQI_DOMAIN_ORDER.map((id) => {
                      const s = snapshot.domainById[id]?.score;
                      const label = snapshot.domainById[id]?.label ?? id;
                      return (
                        <View key={id} style={styles.domainLine}>
                          <View
                            style={[
                              styles.domainDot,
                              { backgroundColor: PSQI_DOMAIN_ACCENT[id] },
                            ]}
                          />
                          <Text style={[typography.caption, styles.domainLineLabel]} numberOfLines={2}>
                            {label}
                          </Text>
                          <Text style={[typography.title, styles.domainLineScore]}>
                            {s !== null && s !== undefined ? String(s) : "n/a"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </View>
          ) : (
            <Text style={[typography.caption, styles.mutedBlock]}>
              When you complete PSQI, your global score and domain scores will appear here with the same values as on the home card.
            </Text>
          )}

          <Text style={[typography.micro, styles.sectionEyebrow]}>Global score (0 to 21)</Text>
          <Text style={[typography.caption, styles.para]}>
            The PSQI total is the sum of seven component scores, each ranging from 0 (best) to 3 (worst). Lower totals mean less self-reported sleep difficulty; higher totals mean more burden across components. The semicircle on the home card fills in proportion to your total; small tick marks sit at totals 5, 10, and 15 to anchor common interpretation zones (roughly good / moderate / poor in many studies when using a cutoff of 5 on the global score).
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Domain strip (seven columns)</Text>
          <Text style={[typography.caption, styles.para]}>
            Each column is one PSQI component. The three blocks stack severity within that component: more filled blocks mean a higher (worse) 0 to 3 score. Colors separate domains so you can see where burden clusters (e.g., disturbance vs. efficiency).
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Components in depth</Text>
          {PSQI_DOMAIN_ORDER.map((id) => (
            <View key={id} style={styles.domainCard}>
              <Text style={[typography.caption, styles.domainCardTitle]}>
                {DOMAIN_COPY[id].title}
              </Text>
              <Text style={[typography.caption, styles.domainCardBody]}>
                {DOMAIN_COPY[id].body}
              </Text>
            </View>
          ))}

          <Text style={[typography.micro, styles.sectionEyebrow]}>Scoring notes in NeoTherm</Text>
          <Text style={[typography.caption, styles.para]}>
            • Questions 5b through 5i contribute their frequencies to disturbance. Question 5j follows the publication update: if “other” is endorsed but no comment is stored with the response, that item counts as 0 in the disturbance sum.{"\n\n"}
            • Latency combines the “cannot sleep within 30 minutes” item with your latency category (aligned with PSQI “Q2new” bins).{"\n\n"}
            • Daytime dysfunction uses the sum of Q8 and Q9 with standard PSQI brackets.{"\n\n"}
            • Because NeoTherm uses time and duration categories instead of raw clock entry, sleep efficiency uses representative midpoints from your chosen buckets: adequate for trends and self-monitoring but not identical to handwritten times.{"\n\n"}
            • Only items needed for publication PSQI scoring (typically questions 1 to 9) are required to compute your total here; partner-reported items are not part of the published global score.
          </Text>

          <Text style={[typography.micro, styles.sectionEyebrow]}>Reference</Text>
          <Text style={[typography.caption, styles.para, styles.reference]}>
            Buysse DJ, Reynolds CF III, Monk TH, Berman SR, Kupfer DJ. The Pittsburgh Sleep Quality Index: a new instrument for psychiatric practice and research. Psychiatry Research. 1989;28(2):193 to 213.
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
          <View
            style={[
              styles.androidSheet,
            ]}
          >
            {body}
          </View>
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
  domainList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  domainLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  domainLineLabel: {
    flex: 1,
    color: NAVY,
    fontWeight: "600",
  },
  domainLineScore: {
    color: NAVY,
    fontVariant: ["tabular-nums"],
    minWidth: 28,
    textAlign: "right",
    fontSize: 16,
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
  domainCard: {
    backgroundColor: SURFACE,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STROKE,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    gap: spacing.xs,
  },
  domainCardTitle: {
    color: NAVY,
    fontWeight: "700",
  },
  domainCardBody: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
});

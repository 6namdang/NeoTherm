import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { FormResponse } from "../../lib/api";
import { summarizeFormResponseForScoreboard } from "../../lib/doctor-patient-scoreboard";
import { formatClinicianAnswerRows } from "../../lib/doctor-form-answer-format";
import {
  dedupeFormResponses,
  stableSubmissionKey,
} from "../../lib/doctor-form-response-keys";
import { colors } from "../../theme/colors";
import { fontFamily } from "../../theme/fontFamily";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { formatRelativeToNowIso } from "../../lib/format-relative-past";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function visitTitle(iso: string): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(t));
  } catch {
    return iso;
  }
}

function visitSubtitle(iso: string): string {
  return formatRelativeToNowIso(iso);
}

function visitClock(iso: string): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(t));
  } catch {
    return "";
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  instrumentTitle: string;
  formId: string;
  submissions: FormResponse[];
};

export function DoctorInstrumentDetailModal({
  visible,
  onClose,
  instrumentTitle,
  formId,
  submissions,
}: Props) {
  const insets = useSafeAreaInsets();
  const visits = useMemo(() => {
    const deduped = dedupeFormResponses(submissions);
    return [...deduped].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  }, [submissions]);

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible || visits.length === 0) {
      setExpandedMap({});
      return;
    }
    const firstKey = stableSubmissionKey(visits[0]!, 0);
    setExpandedMap({ [firstKey]: true });
  }, [visible, visits]);

  function toggleVisit(key: string): void {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={styles.root}>
        <BlurView intensity={88} tint="light" style={styles.blurHeader}>
          <View
            style={[
              styles.headerSafe,
              { paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 8 : spacing.sm) },
            ]}
          >
            <View style={styles.headerBar}>
              <View style={styles.headerLeading}>
                <Pressable
                  accessibilityHint="Dismisses questionnaire detail"
                  accessibilityLabel="Done"
                  accessibilityRole="button"
                  hitSlop={14}
                  onPress={onClose}
                  style={({ pressed }) => [styles.doneBtn, pressed && styles.donePressed]}
                >
                  <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
              </View>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                pointerEvents="none"
                style={[styles.headerCenterTitle, typography.caption]}
              >
                Responses
              </Text>
            </View>
          </View>
        </BlurView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text accessibilityRole="header" style={[styles.heroTitle, typography.title]}>
            {instrumentTitle}
          </Text>
          <Text style={[styles.heroMeta, typography.caption]}>
            {visits.length} recorded visit{visits.length === 1 ? "" : "s"} · Newest listed first · Same
            scoring as patient view
          </Text>

          {visits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons color={colors.textMuted} name="document-text-outline" size={36} />
              <Text style={[typography.body, styles.emptyTitle]}>No submissions in this batch</Text>
              <Text style={[typography.caption, styles.emptySub]}>
                Pull to refresh the roster or expand another programme. Older visits may require loading
                more history from your administrator.
              </Text>
            </View>
          ) : (
            visits.map((sub, visitIndex) => {
              const key = stableSubmissionKey(sub, visitIndex);
              const answers =
                sub.answers && typeof sub.answers === "object"
                  ? (sub.answers as Record<string, unknown>)
                  : {};
              const headline = summarizeFormResponseForScoreboard(formId, answers);
              const rows = formatClinicianAnswerRows(formId, answers);
              const expanded = Boolean(expandedMap[key]);
              const title = visitTitle(sub.created_at);
              const subLine = visitSubtitle(sub.created_at);
              const clock = visitClock(sub.created_at);

              const a11yLabel = `${title}${clock ? ` at ${clock}` : ""}${headline !== null ? `, headline score ${headline}` : ""}${expanded ? ", expanded" : ", collapsed"}`;

              return (
                <View key={key} style={styles.visitShell}>
                  <Pressable
                    accessibilityHint={
                      expanded
                        ? "Double tap to collapse item responses"
                        : "Double tap to expand item responses"
                    }
                    accessibilityLabel={a11yLabel}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    android_ripple={
                      Platform.OS === "android" ? { color: colors.overlay } : undefined
                    }
                    onPress={() => toggleVisit(key)}
                    style={({ pressed }) => [
                      styles.visitHeader,
                      pressed && Platform.OS === "ios" && styles.visitHeaderPressed,
                    ]}
                  >
                    <View style={styles.visitHeaderMain}>
                      <View style={styles.visitBadge}>
                        <Text style={[styles.visitBadgeText, typography.micro]}>
                          {visitIndex === 0 ? "#1 · Latest" : `#${visitIndex + 1}`}
                        </Text>
                      </View>
                      <View style={styles.visitTitles}>
                        <Text style={[styles.visitPrimaryDate, typography.bodyStrong]}>{title}</Text>
                        <Text style={[styles.visitSecondary, typography.caption]}>
                          {[clock, subLine].filter(Boolean).join(" · ") || "Submitted"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.visitHeaderTrail}>
                      {headline !== null ? (
                        <View style={styles.scoreChip}>
                          <Text style={[styles.scoreChipLab, typography.micro]}>Score</Text>
                          <Text style={[styles.scoreChipVal, typography.title]}>{headline}</Text>
                        </View>
                      ) : (
                        <View style={styles.scoreChipMuted}>
                          <Text style={[styles.scoreChipMutedTxt, typography.caption]}>—</Text>
                        </View>
                      )}
                      <Ionicons
                        accessibilityElementsHidden
                        color={colors.textMuted}
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={22}
                      />
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.visitBody}>
                      <Text style={[styles.itemsHeading, typography.micro]}>
                        {rows.length} item{rows.length === 1 ? "" : "s"}
                      </Text>
                      {rows.length === 0 ? (
                        <Text style={[typography.caption, styles.mutedBody]}>
                          No structured answers stored for this submission.
                        </Text>
                      ) : (
                        rows.map((r, i) => (
                          <View
                            key={`${key}-ans-${i}`}
                            style={[
                              styles.answerBlock,
                              i === rows.length - 1 && styles.answerBlockLast,
                            ]}
                          >
                            <Text style={[styles.answerQuestion, typography.caption]}>{r.label}</Text>
                            <Text style={[styles.answerChoice, typography.bodyStrong]}>{r.value}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.homeIndicatorPad} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    maxHeight: "100%",
  },
  blurHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
  headerSafe: {
    paddingBottom: spacing.sm,
  },
  headerBar: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  headerLeading: {
    position: "absolute",
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 2,
    minWidth: 72,
    maxWidth: "42%",
  },
  headerCenterTitle: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fontFamily.semiBold,
    textAlign: "center",
    alignSelf: "center",
    paddingHorizontal: 88,
  },
  scroll: {
    flex: 1,
  },
  doneBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingRight: spacing.sm,
    alignSelf: "flex-start",
  },
  donePressed: {
    opacity: 0.65,
  },
  doneLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    color: colors.primary,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.text,
    letterSpacing: -0.35,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptySub: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 320,
  },
  visitShell: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
      },
      default: {
        elevation: 3,
      },
    }),
  },
  visitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  visitHeaderPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  visitHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  visitBadge: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  visitBadgeText: {
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    fontFamily: fontFamily.bold,
  },
  visitTitles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  visitPrimaryDate: {
    color: colors.text,
  },
  visitSecondary: {
    color: colors.textMuted,
  },
  visitHeaderTrail: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  scoreChip: {
    alignItems: "flex-end",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 56,
  },
  scoreChipLab: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 1,
  },
  scoreChipVal: {
    color: colors.primary,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  scoreChipMuted: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  scoreChipMutedTxt: {
    color: colors.textMuted,
  },
  visitBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
  },
  itemsHeading: {
    color: colors.textMuted,
    letterSpacing: 0.55,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  mutedBody: {
    color: colors.textMuted,
    lineHeight: 19,
    paddingVertical: spacing.sm,
  },
  answerBlock: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: 6,
  },
  answerBlockLast: {
    borderBottomWidth: 0,
  },
  answerQuestion: {
    color: colors.textSecondary,
    lineHeight: 19,
  },
  answerChoice: {
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  homeIndicatorPad: {
    backgroundColor: colors.background,
  },
});

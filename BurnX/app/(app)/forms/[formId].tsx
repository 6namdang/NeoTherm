import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { PageHeader } from "../../../src/components/PageHeader";
import { FormProgress } from "../../../src/components/forms/FormProgress";
import { FormRecallPeriodChip } from "../../../src/components/forms/FormRecallPeriodChip";
import { ScaleQuestion } from "../../../src/components/forms/ScaleQuestion";
import { getFormById } from "../../../src/constants/forms";
import { isEmaFormId } from "../../../src/constants/ema-forms";
import type { ScaleAnswers } from "../../../src/constants/forms/types";
import {
  answeredVisibleProgress,
  firstUnansweredVisible,
  prevVisibleQuestionId,
} from "../../../src/lib/form-engine";
import {
  buildFormRecallPeriodLabel,
} from "../../../src/lib/burn-date";
import { bxLog } from "../../../src/lib/debug-log";
import {
  persistAssignmentSubmissionClientTime,
  resolveAssignmentSnapshot,
} from "../../../src/lib/form-assignment-eligibility";
import { clearEmaScheduleCache } from "../../../src/lib/ema-assignment-eligibility";
import {
  cancelAuditStrike,
  refreshSchedules,
} from "../../../src/lib/notifications-engine";
import { submitFormResponse } from "../../../src/lib/api";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

const ADVANCE_MS = 120;

/** Question transitions — restrained fade (TONE.md: subtle motion only). */
const Q_ENTERING = FadeIn.duration(320)
  .springify()
  .damping(26)
  .stiffness(220)
  .mass(0.85);
const Q_EXITING = FadeOut.duration(220);

function clearAdv(t: ReturnType<typeof setTimeout> | null) {
  if (t !== null) clearTimeout(t);
  return null;
}

export default function FormRunnerScreen() {
  const params = useLocalSearchParams<{ formId?: string | string[] }>();
  const formId = Array.isArray(params.formId)
    ? params.formId[0] ?? ""
    : params.formId ?? "";

  const formDef = useMemo(
    () => (formId ? getFormById(formId) : undefined),
    [formId],
  );

  const [headerLine, setHeaderLine] = useState("");
  const [booting, setBooting] = useState(() => Boolean(formDef));
  const [answers, setAnswers] = useState<ScaleAnswers>({});
  const [qid, setQid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAnswers({});
    setQid(null);
    setHeaderLine("");
    setSubmitSuccess(false);
    setBooting(Boolean(formDef));
  }, [formId, formDef]);

  useEffect(() => {
    if (!formDef) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    advRef.current = clearAdv(advRef.current);

    (async () => {
      const snap = await resolveAssignmentSnapshot(formId);
      if (cancelled) return;
      if (!snap.pending) {
        router.navigate("/" as Href);
        return;
      }
      setHeaderLine(
        buildFormRecallPeriodLabel(snap.injuryDate, snap.lastCompletedAt),
      );
      const first = firstUnansweredVisible(formDef, {});
      if (!cancelled) setQid(first?.id ?? null);
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
      advRef.current = clearAdv(advRef.current);
    };
  }, [formId, formDef]);

  if (!formDef) {
    return (
      <Screen animateEntry preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader
          title="Not available"
          subtitle="This instrument is not enabled for your account yet. Return to the home tab or contact your care team."
          onBackPress={() => router.back()}
        />
      </Screen>
    );
  }

  const instrument = formDef;

  const readyToSubmit =
    firstUnansweredVisible(instrument, answers) === null &&
    Object.keys(answers).length > 0;

  function onPick(optionIndex: number): void {
    if (busy || qid === null) return;
    advRef.current = clearAdv(advRef.current);
    const nextAnswers: ScaleAnswers = { ...answers, [qid]: optionIndex };
    setAnswers(nextAnswers);
    advRef.current = setTimeout(() => {
      advRef.current = null;
      const stillUnanswered = firstUnansweredVisible(instrument, nextAnswers);
      if (stillUnanswered === null) {
        // Stay on final question until the user taps "Submit questionnaire".
        return;
      }
      setQid(stillUnanswered.id);
    }, ADVANCE_MS);
  }

  function onBack(): void {
    if (busy || qid === null) return;
    const prevId = prevVisibleQuestionId(instrument, answers, qid);
    if (prevId !== null) setQid(prevId);
    else router.back();
  }

  async function runSubmit(finalAnswers: ScaleAnswers): Promise<void> {
    setBusy(true);
    try {
      await submitFormResponse({
        form_id: instrument.id,
        answers: { ...finalAnswers },
      });

      try {
        await persistAssignmentSubmissionClientTime(instrument.id);
      } catch (cacheErr) {
        bxLog("forms", "cache write failed (non-fatal)", { formId, cacheErr });
      }

      if (isEmaFormId(instrument.id)) {
        clearEmaScheduleCache();
        void refreshSchedules();
        void cancelAuditStrike();
      }

      setSubmitSuccess(true);
    } catch (caught) {
      bxLog("forms", "submit failed", { formId, caught });
      const detail =
        caught instanceof Error ? caught.message.trim() : "";
      const body =
        detail.length > 0
          ? `Your responses were not saved.\n\n${detail}\n\nCheck your connection or sign in again. If this continues, contact your care team or hospital support.`
          : "Your responses were not saved. Check your connection or sign in again. If this continues, contact your care team or hospital support.";
      Alert.alert("Unable to submit", body);
    } finally {
      setBusy(false);
    }
  }

  function goToDashboard(): void {
    router.navigate("/" as Href);
  }

  const flatQs = instrument.sections.flatMap((s) => s.questions);
  const currentQ =
    qid !== null ? flatQs.find((q) => q.id === qid) : undefined;
  const scale =
    currentQ !== undefined ? instrument.scales[currentQ.scaleId] : undefined;
  const { answered, total } = answeredVisibleProgress(instrument, answers);
  const currentSection =
    currentQ !== undefined
      ? instrument.sections.find((s) =>
          s.questions.some((q) => q.id === currentQ.id),
        )
      : undefined;

  const selectedIdx =
    currentQ !== undefined && answers[currentQ.id] !== undefined
      ? answers[currentQ.id]
      : null;

  return (
    <Screen animateEntry preset="stack" scroll>
      <StatusBar style="dark" />

      <PageHeader
        title={submitSuccess ? "Submitted" : instrument.name}
        eyebrow="Care programs"
        subtitle={
          submitSuccess
            ? "Your answers were saved."
            : instrument.description || undefined
        }
        onBackPress={
          booting
            ? undefined
            : submitSuccess
              ? goToDashboard
              : () => onBack()
        }
      />

      {submitSuccess ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel="Questionnaire submitted successfully"
          style={styles.successBody}
        >
          <View style={styles.successIconWrap}>
            <Ionicons
              color={colors.primary}
              name="checkmark-circle"
              size={64}
            />
          </View>
          <Text style={[styles.successTitle, typography.headlineMedium]}>
            Thank you
          </Text>
          <Text style={[styles.successBodyText, typography.body]}>
            {`Your responses have been submitted and stored for your care team.\nWhen you're ready, return to your dashboard using the Home tab.`}
          </Text>
          <Button
            style={styles.successCta}
            title="Return to dashboard"
            onPress={goToDashboard}
          />
        </View>
      ) : booting || qid === null || !currentQ || !scale ? (
        <View style={styles.loader}>
          <ActivityIndicator accessibilityLabel="Loading form" />
        </View>
      ) : (
        <View style={styles.body}>
          <FormProgress answered={answered} total={total} />
          <FormRecallPeriodChip label={headerLine} />
          <Animated.View
            key={qid}
            entering={Q_ENTERING}
            exiting={Q_EXITING}
            style={styles.questionTransition}
          >
            <ScaleQuestion
              questionText={currentQ.text}
              labels={scale.labels}
              sectionTitle={currentSection?.title}
              sectionInstructions={currentSection?.instructions}
              onPick={onPick}
              selectedOptionIndex={selectedIdx}
              interactionDisabled={busy}
            />
          </Animated.View>
          {readyToSubmit ? (
            <View style={styles.submitPanel}>
              <Text style={[styles.submitHint, typography.body]}>
                You have answered every question in this check-in. Tap submit
                once to save your responses to your care team. You can change
                your answer above before submitting.
              </Text>
              <Button
                disabled={busy}
                style={styles.submitButton}
                title={busy ? "Submitting…" : "Submit questionnaire"}
                onPress={() => void runSubmit(answers)}
              />
            </View>
          ) : null}
          {busy ? (
            <View style={styles.inlineBusy}>
              <ActivityIndicator accessibilityLabel="Submitting responses" />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    minHeight: 200,
  },
  body: {
    marginTop: spacing.sm,
    flexGrow: 1,
  },
  questionTransition: {
    overflow: "hidden",
  },
  submitPanel: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  submitHint: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  submitButton: {
    width: "100%",
    alignSelf: "stretch",
  },
  inlineBusy: {
    marginTop: spacing.lg,
  },
  successBody: {
    marginTop: spacing.xl,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  successIconWrap: {
    marginBottom: spacing.md,
  },
  successTitle: {
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  successBodyText: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    maxWidth: 360,
    lineHeight: 24,
  },
  successCta: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
});

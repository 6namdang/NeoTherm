import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Button } from "../Button";
import { FormProgress } from "./FormProgress";
import { FormRecallPeriodChip } from "./FormRecallPeriodChip";
import { EmaVasQuestion } from "./EmaVasQuestion";
import { ScaleQuestion } from "./ScaleQuestion";
import { getFormById } from "../../constants/forms";
import { isEmaFormId } from "../../constants/ema-forms";
import type { ScaleAnswers, ScaleQuestionnaireForm } from "../../constants/forms/types";
import {
  answeredVisibleProgress,
  firstUnansweredVisible,
  prevVisibleQuestionId,
} from "../../lib/form-engine";
import { bxLog } from "../../lib/debug-log";
import { submitFormResponse } from "../../lib/api";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const ADVANCE_MS = 120;

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

export type ScaleFormRunnerProps = {
  formId: string;
  headerLine?: string;
  eyebrow?: string;
  onSubmitted: (answers: ScaleAnswers) => void | Promise<void>;
  onBackAtStart?: () => void;
  submitErrorMessage?: string;
};

export function ScaleFormRunner({
  formId,
  headerLine = "",
  eyebrow = "Care programs",
  onSubmitted,
  onBackAtStart,
  submitErrorMessage = "Your responses were not saved. Check your connection or sign in again. If this continues, contact your care team or hospital support.",
}: ScaleFormRunnerProps) {
  const formDef = getFormById(formId);
  const [answers, setAnswers] = useState<ScaleAnswers>({});
  const [qid, setQid] = useState<string | null>(null);
  const [booting, setBooting] = useState(() => Boolean(formDef));
  const [busy, setBusy] = useState(false);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAnswers({});
    setQid(null);
    setBooting(Boolean(formDef));
    advRef.current = clearAdv(advRef.current);

    if (!formDef) {
      setBooting(false);
      return;
    }

    const first = firstUnansweredVisible(formDef, {});
    setQid(first?.id ?? null);
    setBooting(false);
  }, [formId, formDef]);

  if (!formDef) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator accessibilityLabel="Loading form" />
      </View>
    );
  }

  const instrument: ScaleQuestionnaireForm = formDef;

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
      if (stillUnanswered === null) return;
      setQid(stillUnanswered.id);
    }, ADVANCE_MS);
  }

  function onEmaSliderValue(optionIndex: number): void {
    if (busy || qid === null) return;
    setAnswers((prev) => ({ ...prev, [qid]: optionIndex }));
  }

  function onBack(): void {
    if (busy || qid === null) return;
    const prevId = prevVisibleQuestionId(instrument, answers, qid);
    if (prevId !== null) setQid(prevId);
    else onBackAtStart?.();
  }

  async function runSubmit(finalAnswers: ScaleAnswers): Promise<void> {
    setBusy(true);
    try {
      await submitFormResponse({
        form_id: instrument.id,
        answers: { ...finalAnswers },
      });
      await onSubmitted(finalAnswers);
    } catch (caught) {
      bxLog("forms", "submit failed", { formId, caught });
      const detail =
        caught instanceof Error ? caught.message.trim() : "";
      const body =
        detail.length > 0
          ? `Your responses were not saved.\n\n${detail}\n\nCheck your connection or sign in again. If this continues, contact your care team or hospital support.`
          : submitErrorMessage;
      Alert.alert("Unable to submit", body);
    } finally {
      setBusy(false);
    }
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

  if (booting || qid === null || !currentQ || !scale) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator accessibilityLabel="Loading form" />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={[styles.instrumentTitle, typography.title]}>{instrument.name}</Text>
      {instrument.description ? (
        <Text style={[styles.instrumentSubtitle, typography.body]}>
          {instrument.description}
        </Text>
      ) : null}
      <Text style={[styles.eyebrow, typography.eyebrow]}>{eyebrow}</Text>
      <FormProgress answered={answered} total={total} />
      {headerLine ? <FormRecallPeriodChip label={headerLine} /> : null}
      <Animated.View
        key={qid}
        entering={Q_ENTERING}
        exiting={Q_EXITING}
        style={styles.questionTransition}
      >
        {isEmaFormId(formId) ? (
          <EmaVasQuestion
            formId={formId}
            questionText={currentQ.text}
            sectionTitle={currentSection?.title}
            sectionInstructions={currentSection?.instructions}
            onValueChange={onEmaSliderValue}
            selectedOptionIndex={selectedIdx}
            interactionDisabled={busy}
          />
        ) : (
          <ScaleQuestion
            questionText={currentQ.text}
            labels={scale.labels}
            sectionTitle={currentSection?.title}
            sectionInstructions={currentSection?.instructions}
            onPick={onPick}
            selectedOptionIndex={selectedIdx}
            interactionDisabled={busy}
          />
        )}
      </Animated.View>
      {readyToSubmit ? (
        <View style={styles.submitPanel}>
          <Text style={[styles.submitHint, typography.body]}>
            You have answered every question in this section. Tap submit once to
            save your responses. You can change your answer above before
            submitting.
          </Text>
          <Button
            disabled={busy}
            style={styles.submitButton}
            title={busy ? "Submitting…" : "Submit questionnaire"}
            onPress={() => void runSubmit(answers)}
          />
        </View>
      ) : null}
      {!readyToSubmit ? (
        <Button
          disabled={busy}
          style={styles.backButton}
          title="Previous question"
          variant="ghost"
          onPress={onBack}
        />
      ) : null}
      {busy ? (
        <View style={styles.inlineBusy}>
          <ActivityIndicator accessibilityLabel="Submitting responses" />
        </View>
      ) : null}
    </View>
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
  instrumentTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instrumentSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
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
  backButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  inlineBusy: {
    marginTop: spacing.lg,
  },
});

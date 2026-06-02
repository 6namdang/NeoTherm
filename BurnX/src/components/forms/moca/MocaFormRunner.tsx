import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import {
  MOCA_FORM,
  MOCA_MAX_AUTOMATED_SCORE,
  MOCA_SECTIONS,
  type MocaAbstractionCapture,
  type MocaDigitSpanCapture,
  type MocaDrawingStroke,
  type MocaLanguageCapture,
  type MocaMemoryCapture,
  type MocaSectionId,
  type MocaSerial7Capture,
  type MocaVerbalFluencyCapture,
  type MocaVigilanceCapture,
} from "../../../constants/forms/moca";
import { submitFormResponse } from "../../../lib/api";
import { buildMocaSubmitPayload } from "../../../lib/build-moca-submit-payload";
import { emptyAbstractionCapture } from "../../../lib/moca-abstraction-scoring";
import { emptyDigitSpanCapture } from "../../../lib/moca-digit-span-scoring";
import { emptyLanguageCapture } from "../../../lib/moca-language-scoring";
import { emptyMemoryTrialCapture } from "../../../lib/moca-memory-scoring";
import { emptyNamingCapture } from "../../../lib/moca-naming-scoring";
import {
  isMocaSectionComplete,
  toMocaRunnerState,
  type MocaRunnerCaptures,
} from "../../../lib/moca-section-completion";
import type { MocaNamingCapture } from "../../../lib/moca-speech-recognition";
import { emptySerial7Capture } from "../../../lib/moca-serial7-scoring";
import { emptyVerbalFluencyCapture } from "../../../lib/moca-verbal-fluency-scoring";
import { emptyVigilanceCapture } from "../../../lib/moca-vigilance-scoring";
import { MocaSubmitValidationError, validateMocaRunnerState } from "../../../lib/validate-moca-submit-payload";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { Button } from "../../Button";
import { FormProgress } from "../FormProgress";
import { MocaAbstractionTask } from "./MocaAbstractionTask";
import { MocaClockDrawTask } from "./MocaClockDrawTask";
import { MocaCubeCopyTask } from "./MocaCubeCopyTask";
import { MocaDelayedRecallTask } from "./MocaDelayedRecallTask";
import { MocaDigitSpanTask } from "./MocaDigitSpanTask";
import { MocaLanguageTask } from "./MocaLanguageTask";
import { MocaMemoryTask } from "./MocaMemoryTask";
import { MocaNamingTask } from "./MocaNamingTask";
import { MocaSerial7Task } from "./MocaSerial7Task";
import type { MocaTrailTapSequence } from "./MocaTrailMakingTask";
import { MocaTrailMakingTask } from "./MocaTrailMakingTask";
import { MocaVerbalFluencyTask } from "./MocaVerbalFluencyTask";
import { MocaVigilanceTask } from "./MocaVigilanceTask";

const Q_ENTERING = FadeIn.duration(320)
  .springify()
  .damping(26)
  .stiffness(220)
  .mass(0.85);
const Q_EXITING = FadeOut.duration(220);

const LAST_SECTION_INDEX = MOCA_SECTIONS.length - 1;

export type MocaFormRunnerProps = {
  eyebrow?: string;
  onSubmitted?: () => void | Promise<void>;
  submitErrorMessage?: string;
};

function emptyMemoryCapture(): MocaMemoryCapture {
  return {
    trial1: emptyMemoryTrialCapture(),
    trial2: emptyMemoryTrialCapture(),
    delayedRecall: emptyMemoryTrialCapture(),
    recallAvailableAt: null,
  };
}

export function MocaFormRunner({
  eyebrow = "Care programs",
  onSubmitted,
  submitErrorMessage = "Your MoCA responses were not saved. Check your connection or sign in again.",
}: MocaFormRunnerProps) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [maxSectionReached, setMaxSectionReached] = useState(0);
  const [busy, setBusy] = useState(false);

  const [trailSequence, setTrailSequence] = useState<MocaTrailTapSequence>([]);
  const [cubeStrokes, setCubeStrokes] = useState<MocaDrawingStroke[]>([]);
  const [clockStrokes, setClockStrokes] = useState<MocaDrawingStroke[]>([]);
  const [namingCapture, setNamingCapture] = useState<MocaNamingCapture>(emptyNamingCapture);
  const [memoryCapture, setMemoryCapture] = useState<MocaMemoryCapture>(emptyMemoryCapture);
  const [digitSpanCapture, setDigitSpanCapture] = useState<MocaDigitSpanCapture>(
    emptyDigitSpanCapture(),
  );
  const [vigilanceCapture, setVigilanceCapture] = useState<MocaVigilanceCapture>(
    emptyVigilanceCapture(),
  );
  const [serial7Capture, setSerial7Capture] = useState<MocaSerial7Capture>(emptySerial7Capture());
  const [languageCapture, setLanguageCapture] = useState<MocaLanguageCapture>(
    emptyLanguageCapture(),
  );
  const [verbalFluencyCapture, setVerbalFluencyCapture] = useState<MocaVerbalFluencyCapture>(
    emptyVerbalFluencyCapture(),
  );
  const [abstractionCapture, setAbstractionCapture] = useState<MocaAbstractionCapture>(
    emptyAbstractionCapture(),
  );

  const section = MOCA_SECTIONS[sectionIndex]!;
  const sectionId: MocaSectionId = section.id;

  const captures: MocaRunnerCaptures = useMemo(
    () => ({
      trailSequence,
      cubeStrokes,
      clockStrokes,
      namingCapture,
      memoryCapture,
      digitSpanCapture,
      vigilanceCapture,
      serial7Capture,
      languageCapture,
      verbalFluencyCapture,
      abstractionCapture,
    }),
    [
      abstractionCapture,
      clockStrokes,
      cubeStrokes,
      digitSpanCapture,
      languageCapture,
      memoryCapture,
      namingCapture,
      serial7Capture,
      trailSequence,
      verbalFluencyCapture,
      vigilanceCapture,
    ],
  );

  const runnerState = useMemo(() => toMocaRunnerState(captures), [captures]);
  const canContinue = isMocaSectionComplete(sectionId, captures);
  const isLastSection = sectionIndex === LAST_SECTION_INDEX;
  const readyToSubmit = isLastSection && canContinue;

  const previewScore = useMemo(() => {
    try {
      validateMocaRunnerState(runnerState);
      return buildMocaSubmitPayload(runnerState, { clientPlatform: Platform.OS }).total_score;
    } catch {
      return null;
    }
  }, [runnerState]);

  const goNext = useCallback(() => {
    if (!canContinue || isLastSection) return;
    setMaxSectionReached((prev) => Math.max(prev, sectionIndex + 1));
    setSectionIndex((prev) => Math.min(prev + 1, LAST_SECTION_INDEX));
  }, [canContinue, isLastSection, sectionIndex]);

  const goPrev = useCallback(() => {
    setSectionIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const runSubmit = useCallback(async () => {
    if (busy || !readyToSubmit) return;
    setBusy(true);
    try {
      validateMocaRunnerState(runnerState);
      const payload = buildMocaSubmitPayload(runnerState, { clientPlatform: Platform.OS });
      await submitFormResponse({
        form_id: MOCA_FORM.id,
        answers: payload as unknown as Record<string, unknown>,
      });
      await onSubmitted?.();
    } catch (caught) {
      const body =
        caught instanceof MocaSubmitValidationError
          ? caught.message
          : caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : submitErrorMessage;
      Alert.alert("Unable to submit MoCA", body);
    } finally {
      setBusy(false);
    }
  }, [busy, onSubmitted, readyToSubmit, runnerState, submitErrorMessage]);

  function renderSection(id: MocaSectionId) {
    switch (id) {
      case "trail":
        return (
          <MocaTrailMakingTask sequence={trailSequence} onSequenceChange={setTrailSequence} />
        );
      case "cube":
        return <MocaCubeCopyTask strokes={cubeStrokes} onStrokesChange={setCubeStrokes} />;
      case "clock":
        return <MocaClockDrawTask strokes={clockStrokes} onStrokesChange={setClockStrokes} />;
      case "naming":
        return <MocaNamingTask capture={namingCapture} onCaptureChange={setNamingCapture} />;
      case "memory":
        return <MocaMemoryTask capture={memoryCapture} onCaptureChange={setMemoryCapture} />;
      case "digit_span_forward":
        return (
          <MocaDigitSpanTask
            capture={digitSpanCapture}
            mode="forward"
            onCaptureChange={setDigitSpanCapture}
          />
        );
      case "digit_span_backward":
        return (
          <MocaDigitSpanTask
            capture={digitSpanCapture}
            mode="backward"
            onCaptureChange={setDigitSpanCapture}
          />
        );
      case "vigilance":
        return (
          <MocaVigilanceTask capture={vigilanceCapture} onCaptureChange={setVigilanceCapture} />
        );
      case "serial7":
        return <MocaSerial7Task capture={serial7Capture} onCaptureChange={setSerial7Capture} />;
      case "language":
        return <MocaLanguageTask capture={languageCapture} onCaptureChange={setLanguageCapture} />;
      case "verbal_fluency":
        return (
          <MocaVerbalFluencyTask
            capture={verbalFluencyCapture}
            onCaptureChange={setVerbalFluencyCapture}
          />
        );
      case "abstraction":
        return (
          <MocaAbstractionTask capture={abstractionCapture} onCaptureChange={setAbstractionCapture} />
        );
      case "delayed_recall":
        return (
          <MocaDelayedRecallTask
            memoryCapture={memoryCapture}
            onMemoryCaptureChange={setMemoryCapture}
          />
        );
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  return (
    <View style={styles.body}>
      <Text style={[styles.instrumentTitle, typography.title]}>{MOCA_FORM.name}</Text>
      {MOCA_FORM.description ? (
        <Text style={[styles.instrumentSubtitle, typography.body]}>{MOCA_FORM.description}</Text>
      ) : null}
      <Text style={[styles.eyebrow, typography.eyebrow]}>{eyebrow}</Text>
      <FormProgress answered={maxSectionReached} total={MOCA_SECTIONS.length} />
      <Animated.View
        key={sectionId}
        entering={Q_ENTERING}
        exiting={Q_EXITING}
        style={styles.questionTransition}
      >
        {renderSection(sectionId)}
      </Animated.View>
      {readyToSubmit ? (
        <View style={styles.submitPanel}>
          <Text style={[styles.submitHint, typography.body]}>
            You have completed every MoCA section. Tap submit once to save your responses to your
            care record.
            {previewScore !== null
              ? ` Automated score snapshot: ${previewScore} / ${MOCA_MAX_AUTOMATED_SCORE}.`
              : ""}
            {Platform.OS === "ios"
              ? " Cube and clock drawings are saved for clinician review."
              : ""}
          </Text>
          <Button
            disabled={busy}
            style={styles.submitButton}
            title={busy ? "Submitting…" : "Submit MoCA"}
            onPress={() => void runSubmit()}
          />
        </View>
      ) : null}
      {!readyToSubmit ? (
        <Button
          disabled={!canContinue || busy}
          style={styles.continueButton}
          title="Continue"
          onPress={goNext}
        />
      ) : null}
      {sectionIndex > 0 ? (
        <Button
          disabled={busy}
          style={styles.backButton}
          title="Previous question"
          variant="ghost"
          onPress={goPrev}
        />
      ) : null}
      {busy ? (
        <View style={styles.inlineBusy}>
          <ActivityIndicator accessibilityLabel="Submitting MoCA responses" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    marginTop: spacing.sm,
  },
  instrumentTitle: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instrumentSubtitle: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  questionTransition: {
    overflow: "hidden",
  },
  continueButton: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
    width: "100%",
  },
  backButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
  },
  submitPanel: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  submitHint: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  submitButton: {
    alignSelf: "stretch",
    width: "100%",
  },
  inlineBusy: {
    marginTop: spacing.lg,
  },
});

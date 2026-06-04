import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import {
  MOCA_FORM,
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
import { MocaSubmitValidationError, isMocaRunnerSubmitReady, validateMocaRunnerState } from "../../../lib/validate-moca-submit-payload";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
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

const LAST_SECTION_INDEX = MOCA_SECTIONS.length - 1;

export type MocaFormRunnerProps = {
  onSubmitted?: () => void | Promise<void>;
  submitErrorMessage?: string;
  /** Disable parent Screen scroll while the user draws on cube/clock canvas. */
  onParentScrollEnabledChange?: (enabled: boolean) => void;
};

function sectionGateHint(sectionId: MocaSectionId): string {
  switch (sectionId) {
    case "naming":
      return "Tap Stop when you are finished naming the animals.";
    case "digit_span_forward":
    case "digit_span_backward":
      return "Tap Stop when you are finished repeating the numbers.";
    case "trail":
      return "Complete the full tap sequence to enable Continue.";
    case "cube":
    case "clock":
      return "Draw in the box above to enable Continue.";
    default:
      return "Complete this section to enable Continue.";
  }
}

function emptyMemoryCapture(): MocaMemoryCapture {
  return {
    trial1: emptyMemoryTrialCapture(),
    trial2: emptyMemoryTrialCapture(),
    delayedRecall: emptyMemoryTrialCapture(),
    recallAvailableAt: null,
  };
}

export function MocaFormRunner({
  onSubmitted,
  submitErrorMessage = "Your MoCA responses were not saved. Check your connection or sign in again.",
  onParentScrollEnabledChange,
}: MocaFormRunnerProps) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [maxSectionReached, setMaxSectionReached] = useState(0);
  const [busy, setBusy] = useState(false);

  const handleDrawingActiveChange = useCallback(
    (active: boolean) => {
      onParentScrollEnabledChange?.(!active);
    },
    [onParentScrollEnabledChange],
  );

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

  useEffect(() => {
    onParentScrollEnabledChange?.(true);
  }, [sectionId, onParentScrollEnabledChange]);

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
  const readyToSubmit = isLastSection && isMocaRunnerSubmitReady(runnerState);

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
    } catch (caught) {
      const body =
        caught instanceof MocaSubmitValidationError
          ? caught.message
          : caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : submitErrorMessage;
      Alert.alert("Unable to submit MoCA", body);
      return;
    } finally {
      setBusy(false);
    }

    try {
      await onSubmitted?.();
    } catch {
      Alert.alert(
        "MoCA saved",
        "Your responses were saved, but the app could not navigate away. Use the back button to continue.",
      );
    }
  }, [busy, onSubmitted, readyToSubmit, runnerState, submitErrorMessage]);

  function renderSection(id: MocaSectionId) {
    switch (id) {
      case "trail":
        return (
          <MocaTrailMakingTask sequence={trailSequence} onSequenceChange={setTrailSequence} />
        );
      case "cube":
        return (
          <MocaCubeCopyTask
            onDrawingActiveChange={handleDrawingActiveChange}
            onStrokesChange={setCubeStrokes}
            strokes={cubeStrokes}
          />
        );
      case "clock":
        return (
          <MocaClockDrawTask
            onDrawingActiveChange={handleDrawingActiveChange}
            onStrokesChange={setClockStrokes}
            strokes={clockStrokes}
          />
        );
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
      <FormProgress answered={maxSectionReached} total={MOCA_SECTIONS.length} />
      <Animated.View key={sectionId} entering={Q_ENTERING} style={styles.questionTransition}>
        {renderSection(sectionId)}
      </Animated.View>
      {!canContinue && !readyToSubmit ? (
        <Text style={[styles.sectionGateHint, typography.caption]}>{sectionGateHint(sectionId)}</Text>
      ) : null}
      {readyToSubmit ? (
        <View style={styles.submitPanel}>
          {busy ? (
            <View style={styles.submittingCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.submittingTitle}>Saving your responses…</Text>
              <Text style={styles.submittingCaption}>
                This may take a moment. Please don't close the app.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.submitHint, typography.body]}>
                You have completed every MoCA section. Tap submit to save.
              </Text>
              <Button
                style={styles.submitButton}
                title="Submit MoCA"
                onPress={() => void runSubmit()}
              />
            </>
          )}
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
      {sectionIndex > 0 && !busy ? (
        <Button
          style={styles.backButton}
          title="Previous question"
          variant="ghost"
          onPress={goPrev}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    marginTop: spacing.sm,
  },
  questionTransition: {
    overflow: "hidden",
  },
  sectionGateHint: {
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
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
  submittingCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  submittingTitle: {
    color: colors.text,
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  submittingCaption: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

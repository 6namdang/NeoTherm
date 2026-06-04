import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { type MocaMemoryCapture } from "../../../constants/forms/moca";
import { scoreDelayedRecallResponse } from "../../../lib/moca-memory-scoring";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import {
  MocaCompactButton,
  MocaInlineNote,
  MocaMemoryDelayRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFrame,
  MocaTaskPrompt,
} from "./MocaSectionChrome";

type MocaDelayedRecallTaskProps = {
  memoryCapture: MocaMemoryCapture;
  onMemoryCaptureChange: (capture: MocaMemoryCapture) => void;
};

function formatCountdown(remainMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function MocaDelayedRecallTask({
  memoryCapture,
  onMemoryCaptureChange,
}: MocaDelayedRecallTaskProps) {
  const [draftResponse, setDraftResponse] = useState(
    () => memoryCapture.delayedRecall.transcript,
  );
  const [submitted, setSubmitted] = useState(
    () => memoryCapture.delayedRecall.transcript.trim().length > 0,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  const learningStarted = memoryCapture.recallAvailableAt !== null;
  const recallRemainMs =
    memoryCapture.recallAvailableAt === null
      ? 0
      : Math.max(0, memoryCapture.recallAvailableAt - nowMs);
  const recallReady = learningStarted && recallRemainMs <= 0;

  useEffect(() => {
    if (!learningStarted || recallReady) return;
    const tick = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(tick);
  }, [learningStarted, recallReady]);

  useEffect(() => {
    if (memoryCapture.delayedRecall.transcript.trim().length > 0) return;
    setDraftResponse("");
    setSubmitted(false);
  }, [memoryCapture.delayedRecall.transcript]);

  const submitResponse = useCallback(() => {
    const delayedRecall = scoreDelayedRecallResponse(draftResponse);
    onMemoryCaptureChange({
      ...memoryCapture,
      delayedRecall,
    });
    setSubmitted(true);
  }, [draftResponse, memoryCapture, onMemoryCaptureChange]);

  const canSubmit = recallReady && !submitted && draftResponse.trim().length > 0;

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="DELAYED RECALL" />

      <MocaTaskPrompt>
        I read some words to you earlier, which I asked you to remember. Tell me as many of
        those words as you can remember.
      </MocaTaskPrompt>

      {!learningStarted ? (
        <MocaInlineNote>Complete the memory learning trials first to start the delay timer.</MocaInlineNote>
      ) : null}

      {learningStarted && !recallReady ? (
        <MocaMemoryDelayRow countdown={formatCountdown(recallRemainMs)} />
      ) : null}

      {recallReady && !submitted ? (
        <MocaTaskFrame style={styles.formFrame}>
          <Text style={[typography.caption, styles.fieldLabel]}>Your answer</Text>
          <TextInput
            multiline
            onChangeText={setDraftResponse}
            placeholder="Type as many words as you remember"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, typography.body]}
            textAlignVertical="top"
            value={draftResponse}
          />
        </MocaTaskFrame>
      ) : null}

      {!submitted && recallReady ? (
        <View style={styles.actionBar}>
          <MocaCompactButton disabled={!canSubmit} title="Submit answer" onPress={submitResponse} />
        </View>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  formFrame: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semiBold,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
});

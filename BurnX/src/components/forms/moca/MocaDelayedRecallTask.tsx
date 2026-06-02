import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  MOCA_MEMORY_WORDS,
  type MocaMemoryCapture,
} from "../../../constants/forms/moca";
import {
  delayedRecallChecklist,
  scoreDelayedRecallResponse,
} from "../../../lib/moca-memory-scoring";
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
  MocaTaskFooter,
  MocaTaskFrame,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
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

function formatWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
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

  const checklist = submitted
    ? delayedRecallChecklist(memoryCapture.delayedRecall.transcript)
    : [];
  const score = memoryCapture.delayedRecall.detectedWords.length;

  const submitResponse = useCallback(() => {
    const delayedRecall = scoreDelayedRecallResponse(draftResponse);
    onMemoryCaptureChange({
      ...memoryCapture,
      delayedRecall,
    });
    setSubmitted(true);
  }, [draftResponse, memoryCapture, onMemoryCaptureChange]);

  const resetTask = useCallback(() => {
    setDraftResponse("");
    setSubmitted(false);
    onMemoryCaptureChange({
      ...memoryCapture,
      delayedRecall: { transcript: "", detectedWords: [] },
    });
  }, [memoryCapture, onMemoryCaptureChange]);

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

      {recallReady ? (
        <MocaTaskFrame style={styles.formFrame}>
          <Text style={[typography.caption, styles.fieldLabel]}>Your answer</Text>
          <TextInput
            editable={!submitted}
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

      {submitted ? (
        <View style={styles.summaryStack}>
          <MocaVoiceStatus
            body={memoryCapture.delayedRecall.transcript || "—"}
            footer={`MoCA score: ${score} / ${MOCA_MEMORY_WORDS.length} points`}
            label="Your response"
          />
          <View style={styles.checklist}>
            {checklist.map(({ word, recalled }) => (
              <View key={word} style={styles.checklistRow}>
                <Text style={[styles.checkMark, recalled ? styles.checkMarkOn : null]}>
                  {recalled ? "✓" : "—"}
                </Text>
                <Text style={[typography.body, styles.checklistWord]}>{formatWord(word)}</Text>
              </View>
            ))}
          </View>
          <MocaInlineNote>
            One point per word correctly recalled spontaneously without cues.
          </MocaInlineNote>
        </View>
      ) : null}

      {submitted ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={resetTask} />
        </MocaTaskFooter>
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
  summaryStack: {
    gap: spacing.md,
    width: "100%",
  },
  checklist: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    gap: spacing.sm,
    padding: spacing.md,
  },
  checklistRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  checkMark: {
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: 18,
    width: 20,
  },
  checkMarkOn: {
    color: colors.success,
  },
  checklistWord: {
    color: colors.text,
  },
});

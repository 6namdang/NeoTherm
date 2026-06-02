import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  MOCA_ABSTRACTION_EXAMPLE,
  MOCA_ABSTRACTION_PAIRS,
  type MocaAbstractionCapture,
} from "../../../constants/forms/moca";
import {
  emptyAbstractionAnswers,
  emptyAbstractionCapture,
  scoreAbstraction,
} from "../../../lib/moca-abstraction-scoring";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import {
  MocaCompactButton,
  MocaInlineNote,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFooter,
  MocaTaskFrame,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
} from "./MocaSectionChrome";

type MocaAbstractionTaskProps = {
  capture: MocaAbstractionCapture;
  onCaptureChange: (capture: MocaAbstractionCapture) => void;
};

export function MocaAbstractionTask({ capture, onCaptureChange }: MocaAbstractionTaskProps) {
  const [draftAnswers, setDraftAnswers] = useState<string[]>(() =>
    capture.completedAt ? capture.answers : emptyAbstractionAnswers(),
  );

  const isComplete = capture.completedAt !== null;
  const displayAnswers = isComplete ? capture.answers : draftAnswers;

  const updateAnswer = useCallback((index: number, value: string) => {
    setDraftAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const submitAnswers = useCallback(() => {
    onCaptureChange(scoreAbstraction(draftAnswers));
  }, [draftAnswers, onCaptureChange]);

  const resetTask = useCallback(() => {
    setDraftAnswers(emptyAbstractionAnswers());
    onCaptureChange(emptyAbstractionCapture());
  }, [onCaptureChange]);

  const canSubmit = !isComplete && draftAnswers.every((answer) => answer.trim().length > 0);

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="ABSTRACTION" />

      <MocaTaskPrompt>
        Tell me how each pair of items is similar — what they have in common.
      </MocaTaskPrompt>

      <MocaTaskFrame style={styles.exampleFrame}>
        <Text style={[typography.caption, styles.exampleLabel]}>Example</Text>
        <Text style={[typography.body, styles.pairTitle]}>
          {MOCA_ABSTRACTION_EXAMPLE.left} — {MOCA_ABSTRACTION_EXAMPLE.right}
        </Text>
        <Text style={[typography.body, styles.question]}>What do these have in common?</Text>
        <Text style={[typography.caption, styles.exampleAnswer]}>
          e.g. {MOCA_ABSTRACTION_EXAMPLE.sampleAnswer}
        </Text>
      </MocaTaskFrame>

      <MocaTaskFrame style={styles.formFrame}>
        <View style={styles.fields}>
          {MOCA_ABSTRACTION_PAIRS.map((pair, index) => {
            const result = capture.results[index];
            return (
              <View key={pair.id} style={styles.fieldBlock}>
                <Text style={[typography.body, styles.pairTitle]}>
                  {pair.left} — {pair.right}
                </Text>
                <Text style={[typography.caption, styles.question]}>What do these have in common?</Text>
                <TextInput
                  editable={!isComplete}
                  onChangeText={(value) => updateAnswer(index, value)}
                  placeholder="Type your answer"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    typography.body,
                    result && !result.correct ? styles.inputWrong : null,
                    result?.correct ? styles.inputCorrect : null,
                  ]}
                  value={displayAnswers[index] ?? ""}
                />
                {isComplete && result ? (
                  <Text style={[typography.caption, styles.fieldHint]}>
                    {result.correct ? "Accepted" : "Not matched — review manually if needed"}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </MocaTaskFrame>

      {!isComplete ? (
        <View style={styles.actionBar}>
          <MocaCompactButton disabled={!canSubmit} title="Submit answers" onPress={submitAnswers} />
        </View>
      ) : null}

      {isComplete ? (
        <View style={styles.summaryStack}>
          <MocaVoiceStatus
            body={`${capture.correctCount} of ${MOCA_ABSTRACTION_PAIRS.length} accepted`}
            footer={`MoCA score: ${capture.score} / 2 points`}
            label="Result"
          />
          <MocaInlineNote>1 point per pair when the similarity category is correct.</MocaInlineNote>
        </View>
      ) : null}

      {isComplete ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={resetTask} />
        </MocaTaskFooter>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  exampleFrame: {
    backgroundColor: colors.surfaceMuted,
    gap: spacing.xs,
    padding: spacing.md,
  },
  exampleLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  exampleAnswer: {
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  formFrame: {
    padding: spacing.md,
  },
  fields: {
    gap: spacing.lg,
    width: "100%",
  },
  fieldBlock: {
    gap: spacing.xs,
    width: "100%",
  },
  pairTitle: {
    color: colors.text,
    fontFamily: fontFamily.semiBold,
  },
  question: {
    color: colors.textSecondary,
  },
  fieldHint: {
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputCorrect: {
    borderColor: colors.success,
  },
  inputWrong: {
    borderColor: colors.danger,
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
  summaryStack: {
    gap: spacing.sm,
    width: "100%",
  },
});

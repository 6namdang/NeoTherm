import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  MOCA_SERIAL7_START,
  MOCA_SERIAL7_STEP,
  MOCA_SERIAL7_SUBTRACTION_COUNT,
  type MocaSerial7Capture,
} from "../../../constants/forms/moca";
import {
  emptySerial7Answers,
  emptySerial7Capture,
  scoreSerial7,
} from "../../../lib/moca-serial7-scoring";
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

type MocaSerial7TaskProps = {
  capture: MocaSerial7Capture;
  onCaptureChange: (capture: MocaSerial7Capture) => void;
};

export function MocaSerial7Task({ capture, onCaptureChange }: MocaSerial7TaskProps) {
  const [draftAnswers, setDraftAnswers] = useState<string[]>(() =>
    capture.completedAt ? capture.answers : emptySerial7Answers(),
  );

  const isComplete = capture.completedAt !== null;
  const displayAnswers = isComplete ? capture.answers : draftAnswers;

  const updateAnswer = useCallback(
    (index: number, value: string) => {
      const sanitized = value.replace(/[^\d-]/g, "");
      setDraftAnswers((prev) => {
        const next = [...prev];
        next[index] = sanitized;
        return next;
      });
    },
    [],
  );

  const submitAnswers = useCallback(() => {
    onCaptureChange(scoreSerial7(draftAnswers));
  }, [draftAnswers, onCaptureChange]);

  const resetTask = useCallback(() => {
    setDraftAnswers(emptySerial7Answers());
    onCaptureChange(emptySerial7Capture());
  }, [onCaptureChange]);

  const canSubmit =
    !isComplete && draftAnswers.every((answer) => answer.trim().length > 0);

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="SERIAL 7S" />

      <MocaTaskPrompt>
        Begin at {MOCA_SERIAL7_START} and count backward by subtracting {MOCA_SERIAL7_STEP}. Enter
        each of the five answers below.
      </MocaTaskPrompt>

      <MocaTaskFrame style={styles.formFrame}>
        <View style={styles.fields}>
          {Array.from({ length: MOCA_SERIAL7_SUBTRACTION_COUNT }, (_, index) => {
            const result = capture.results[index];
            return (
              <View key={index} style={styles.fieldRow}>
                <Text style={[typography.caption, styles.fieldLabel]}>{index + 1}.</Text>
                <TextInput
                  editable={!isComplete}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateAnswer(index, value)}
                  placeholder="Enter number"
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
                    {result.correct
                      ? "Correct"
                      : `Expected ${result.expected}${result.parsed === null ? "" : ` (you entered ${result.parsed})`}`}
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
            body={`${capture.correctCount} of ${MOCA_SERIAL7_SUBTRACTION_COUNT} correct`}
            footer={`MoCA score: ${capture.score} / 3 points`}
            label="Result"
          />
          <MocaInlineNote>
            4–5 correct: 3 pts · 2–3 correct: 2 pts · 1 correct: 1 pt · 0 correct: 0 pts
          </MocaInlineNote>
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
  formFrame: {
    padding: spacing.md,
  },
  fields: {
    gap: spacing.md,
    width: "100%",
  },
  fieldRow: {
    gap: spacing.xs,
    width: "100%",
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semiBold,
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

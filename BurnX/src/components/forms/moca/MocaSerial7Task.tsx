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
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFrame,
  MocaTaskPrompt,
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

  const updateAnswer = useCallback((index: number, value: string) => {
    const sanitized = value.replace(/[^\d-]/g, "");
    setDraftAnswers((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
  }, []);

  const submitAnswers = useCallback(() => {
    onCaptureChange(scoreSerial7(draftAnswers));
  }, [draftAnswers, onCaptureChange]);

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
          {Array.from({ length: MOCA_SERIAL7_SUBTRACTION_COUNT }, (_, index) => (
            <View key={index} style={styles.fieldRow}>
              <Text style={[typography.caption, styles.fieldLabel]}>{index + 1}.</Text>
              <TextInput
                editable={!isComplete}
                keyboardType="number-pad"
                onChangeText={(value) => updateAnswer(index, value)}
                placeholder="Enter number"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, typography.body]}
                value={displayAnswers[index] ?? ""}
              />
            </View>
          ))}
        </View>
      </MocaTaskFrame>

      {!isComplete ? (
        <View style={styles.actionBar}>
          <MocaCompactButton disabled={!canSubmit} title="Submit answers" onPress={submitAnswers} />
        </View>
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
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
});

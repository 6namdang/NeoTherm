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
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFrame,
  MocaTaskPrompt,
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
        <Text style={[typography.caption, styles.question]}>What do these have in common?</Text>
        <Text style={[typography.caption, styles.exampleAnswer]}>
          e.g. {MOCA_ABSTRACTION_EXAMPLE.sampleAnswer}
        </Text>
      </MocaTaskFrame>

      <MocaTaskFrame style={styles.formFrame}>
        <View style={styles.fields}>
          {MOCA_ABSTRACTION_PAIRS.map((pair, index) => (
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

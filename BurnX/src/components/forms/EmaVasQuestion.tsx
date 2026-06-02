import { StyleSheet, Text, View } from "react-native";

import { getEmaVasConfig } from "../../lib/ema-vas-config";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { EmaGradientLikertSlider } from "./EmaGradientLikertSlider";

export type EmaVasQuestionProps = {
  formId: string;
  questionText: string;
  onValueChange: (index: number) => void;
  sectionTitle?: string;
  sectionInstructions?: string;
  selectedOptionIndex?: number | null;
  interactionDisabled?: boolean;
};

/**
 * Reusable EMA 0–10 check-in: resolves labels + polarity from `ema-vas-config`
 * and renders the gradient slider (sleep, pain, mood).
 */
export function EmaVasQuestion({
  formId,
  questionText,
  onValueChange,
  sectionTitle,
  sectionInstructions,
  selectedOptionIndex = null,
  interactionDisabled = false,
}: EmaVasQuestionProps) {
  const config = getEmaVasConfig(formId);

  if (!config) {
    return (
      <View style={styles.fallback}>
        <Text style={[styles.fallbackText, typography.body]}>
          This check-in is not configured yet.
        </Text>
      </View>
    );
  }

  return (
    <EmaGradientLikertSlider
      labels={[...config.labels]}
      polarity={config.polarity}
      questionText={questionText}
      sectionInstructions={sectionInstructions}
      sectionTitle={sectionTitle}
      onValueChange={onValueChange}
      selectedOptionIndex={selectedOptionIndex}
      interactionDisabled={interactionDisabled}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  fallbackText: {
    color: colors.textMuted,
    textAlign: "center",
  },
});

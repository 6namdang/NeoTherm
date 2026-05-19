import { Redirect, router, type Href, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { FormRenderer } from "../../../src/components/FormRenderer";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { useToast } from "../../../src/components/ToastProvider";
import { BURN_INTAKE_FORM } from "../../../src/constants/forms/onboarding";
import { useSession } from "../../../src/lib/auth-context";
import { bxLog } from "../../../src/lib/debug-log";
import { useOnboardingBack } from "../../../src/lib/navigation-helpers";
import { validateQuestions } from "../../../src/lib/onboarding-validation";
import { useOnboardingAnswers } from "../../../src/state/onboarding-context";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

const SECTION_ORDER = BURN_INTAKE_FORM.sections.map((s) => s.id);

function nextStep(current: string): string {
  const idx = SECTION_ORDER.indexOf(current);
  if (idx < 0) {
    const first = SECTION_ORDER[0];
    return first ? `/(onboarding)/intake/${first}` : "/(onboarding)/review";
  }
  if (idx >= SECTION_ORDER.length - 1) {
    return "/(onboarding)/review";
  }
  const n = SECTION_ORDER[idx + 1];
  return `/(onboarding)/intake/${n!}`;
}

export default function OnboardingIntakeSectionScreen() {
  const { role } = useSession();
  const { section: sectionId = "" } = useLocalSearchParams<{ section?: string }>();
  const { answers, setAnswer } = useOnboardingAnswers();
  const { showToast } = useToast();
  const backOrWelcome = useOnboardingBack();

  const section = BURN_INTAKE_FORM.sections.find((s) => s.id === sectionId);

  useEffect(() => {
    bxLog("onboarding", "intake section", { sectionId, found: Boolean(section), role });
    if (sectionId && !section && role !== "doctor") {
      bxLog("onboarding", "intake unknown section id", { sectionId });
    }
  }, [section, sectionId, role]);

  /** Patient-only: burn intake. Clinicians skip this stack entirely — guard deep links / history. */
  if (role === "doctor") {
    bxLog("onboarding", "intake: doctor → redirect review (patient-only flow)");
    return <Redirect href={"/(onboarding)/review" as Href} />;
  }

  if (!section) {
    return (
      <Screen preset="stack">
        <StatusBar style="dark" />
        <Text style={typography.body}>That step is unavailable. Go back or restart onboarding.</Text>
      </Screen>
    );
  }

  const currentSection = section;

  function onContinue() {
    bxLog("onboarding", "intake continue", { from: currentSection.id });
    const err = validateQuestions(currentSection.questions, answers);
    if (err) {
      bxLog("onboarding", "intake validation error", { err });
      showToast(err);
      return;
    }
    const next = nextStep(currentSection.id);
    bxLog("onboarding", "intake →", { next });
    router.push(next as Href);
  }

  return (
    <Screen animateEntry keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Questionnaires"
        onBackPress={() => {
          void backOrWelcome();
        }}
        subtitle={currentSection.description ?? BURN_INTAKE_FORM.description ?? ""}
        title={currentSection.title}
      />
      <Card style={styles.card}>
        <FormRenderer
          answers={answers}
          onChange={setAnswer}
          questions={currentSection.questions}
        />
        <Button title="Continue" onPress={onContinue} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});

import { router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { FormRenderer } from "../../src/components/FormRenderer";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/ToastProvider";
import {
  PATIENT_ONBOARDING_FORM,
  DOCTOR_ONBOARDING_FORM,
  BURN_INTAKE_FORM,
} from "../../src/constants/forms/onboarding";
import { useSession } from "../../src/lib/auth-context";
import { bxLog } from "../../src/lib/debug-log";
import { useOnboardingBack } from "../../src/lib/navigation-helpers";
import { validateQuestions } from "../../src/lib/onboarding-validation";
import { useOnboardingAnswers } from "../../src/state/onboarding-context";
import { spacing } from "../../src/theme/spacing";

export default function ProfileCreationScreen() {
  const { role } = useSession();
  const { answers, setAnswer } = useOnboardingAnswers();
  const { showToast } = useToast();
  const backOrWelcome = useOnboardingBack();

  if (role !== "patient" && role !== "doctor") {
    return (
      <Screen preset="stack" scroll={false}>
        <StatusBar style="dark" />
        <View style={styles.pendingRole}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </Screen>
    );
  }

  const formMeta = role === "doctor" ? DOCTOR_ONBOARDING_FORM : PATIENT_ONBOARDING_FORM;
  const section = formMeta.sections[0];
  if (!section) {
    return null;
  }

  function onContinue() {
    bxLog("onboarding", "profile-creation continue", { role });
    const err = validateQuestions(section.questions, answers);
    if (err) {
      bxLog("onboarding", "profile-creation validation error", { err });
      showToast(err);
      return;
    }
    if (role === "doctor") {
      bxLog("onboarding", "profile-creation → review (doctor)");
      router.push("/(onboarding)/review" as Href);
      return;
    }
    const first = BURN_INTAKE_FORM.sections[0]?.id;
    if (first) {
      bxLog("onboarding", "profile-creation → intake", { section: first });
      router.push(`/(onboarding)/intake/${first}` as Href);
    } else {
      bxLog("onboarding", "profile-creation → review (no intake sections)");
      router.push("/(onboarding)/review" as Href);
    }
  }

  return (
    <Screen animateEntry keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow={role === "doctor" ? "Clinician profile" : "About you"}
        onBackPress={() => {
          void backOrWelcome();
        }}
        subtitle={formMeta.description ?? ""}
        title={formMeta.title}
      />
      <Card style={styles.card}>
        <FormRenderer
          answers={answers}
          onChange={setAnswer}
          questions={section.questions}
        />
        <Button
          title={
            role === "doctor" ? "Review and finish on next screen" : "Continue to questionnaires"
          }
          onPress={onContinue}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pendingRole: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
});

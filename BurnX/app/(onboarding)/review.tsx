import { router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/ToastProvider";
import {
  BURN_INTAKE_FORM,
  DOCTOR_ONBOARDING_FORM,
} from "../../src/constants/forms/onboarding";
import { createMe, submitFormResponse } from "../../src/lib/api";
import { useSession } from "../../src/lib/auth-context";
import { bxLog } from "../../src/lib/debug-log";
import { useOnboardingBack } from "../../src/lib/navigation-helpers";
import { validateQuestions } from "../../src/lib/onboarding-validation";
import { usePostAuth } from "../../src/lib/post-auth-context";
import {
  collectBurnIntakeAnswers,
  useOnboardingAnswers,
} from "../../src/state/onboarding-context";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

const DOCTOR_QUESTIONS = DOCTOR_ONBOARDING_FORM.sections.flatMap(
  (s) => s.questions,
);

export default function OnboardingReviewScreen() {
  const { role } = useSession();
  const { answers } = useOnboardingAnswers();
  const { refetch } = usePostAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const backOrWelcome = useOnboardingBack();

  const name = typeof answers.name === "string" ? answers.name.trim() : "";
  const hospitalId =
    typeof answers.hospital_id === "string" ? answers.hospital_id : "";

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

  const isDoctor = role === "doctor";

  async function afterSaveNavigate() {
    bxLog("onboarding", "review → refetch + enter app");
    await refetch();
    const dest = isDoctor ? "/(app-doctor)" : "/(app)";
    router.replace(dest as Href);
    bxLog("onboarding", "review complete", { dest });
  }

  async function onSubmit() {
    bxLog("onboarding", "review submit start", { role });

    if (!name || !hospitalId) {
      bxLog("onboarding", "review validation: missing name or hospital");
      showToast("Please add your full name and hospital before you continue.");
      return;
    }

    if (isDoctor) {
      const docErr = validateQuestions(DOCTOR_QUESTIONS, answers);
      if (docErr) {
        bxLog("onboarding", "review doctor validation failed", { docErr });
        showToast(docErr);
        return;
      }

      const title =
        typeof answers.title === "string"
          ? answers.title
          : String(answers.title ?? "");
      const specialty =
        typeof answers.specialty === "string"
          ? answers.specialty.trim()
          : String(answers.specialty ?? "").trim();
      const deptRaw = answers.department;
      const department =
        typeof deptRaw === "string" && deptRaw.trim() !== ""
          ? deptRaw.trim()
          : undefined;

      setBusy(true);
      try {
        bxLog("onboarding", "review → createMe (doctor)");
        await createMe({
          name,
          hospital_id: hospitalId,
          title,
          specialty,
          department,
        });
        try {
          await afterSaveNavigate();
        } catch (e) {
          bxLog("onboarding", "review doctor refetch/replace failed", {
            message: e instanceof Error ? e.message : String(e),
          });
          showToast(e instanceof Error ? e.message : "Could not reload your account after saving. Try reopening the app.");
        }
      } catch (e) {
        bxLog("onboarding", "review POST /me failed (doctor)", {
          message: e instanceof Error ? e.message : String(e),
        });
        showToast(
          `Couldn't save your profile. ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    const allIntakeQuestions = BURN_INTAKE_FORM.sections.flatMap(
      (s) => s.questions,
    );
    const intakeErr = validateQuestions(allIntakeQuestions, answers);
    if (intakeErr) {
      bxLog("onboarding", "review validation failed", { intakeErr });
      showToast(intakeErr);
      return;
    }

    setBusy(true);
    try {
      try {
        bxLog("onboarding", "review → createMe (patient)");
        await createMe({ name, hospital_id: hospitalId });
      } catch (e) {
        bxLog("onboarding", "review POST /me failed", {
          message: e instanceof Error ? e.message : String(e),
        });
        showToast(
          `Couldn't save your profile. ${e instanceof Error ? e.message : String(e)}`,
        );
        return;
      }
      try {
        const intakePayload = collectBurnIntakeAnswers(answers);
        bxLog("onboarding", "review → submitFormResponse", {
          keys: Object.keys(intakePayload),
        });
        await submitFormResponse({
          form_id: BURN_INTAKE_FORM.id,
          answers: intakePayload,
        });
      } catch (e) {
        bxLog("onboarding", "review POST /form-responses failed", {
          message: e instanceof Error ? e.message : String(e),
        });
        showToast(`Couldn't save intake. ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
      try {
        await afterSaveNavigate();
      } catch (e) {
        bxLog("onboarding", "review refetch/replace failed", {
          message: e instanceof Error ? e.message : String(e),
        });
        showToast(
          e instanceof Error
            ? e.message
            : "Could not reload your account after saving. Try reopening the app.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen animateEntry keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Review"
        onBackPress={() => {
          void backOrWelcome();
        }}
        subtitle={
          isDoctor
            ? "We'll save your profile so you can use the clinician app."
            : "We'll save your profile and questionnaires for your burn care team."
        }
        title="Finish setup"
      />
      <Card style={styles.card}>
        <Text style={[typography.body, styles.summary]}>
          {isDoctor
            ? "When you're ready, we store your clinician details securely. Your hospital's credentialing office can update them later."
            : "We'll send along the information you entered so your burn team sees one consistent record. Tell them directly if anything changes."}
        </Text>
        {busy ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Button
            title={isDoctor ? "Open clinician app" : "Submit and finish"}
            onPress={onSubmit}
          />
        )}
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
  summary: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

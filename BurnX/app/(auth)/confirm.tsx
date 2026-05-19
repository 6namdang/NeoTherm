import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Input } from "../../src/components/Input";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useConfirmSignupForm } from "../../src/lib/auth-forms";
import { bxLog } from "../../src/lib/debug-log";
import { useAuthScreenBack } from "../../src/lib/navigation-helpers";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

export default function ConfirmScreen() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const form = useConfirmSignupForm(email);
  const back = useAuthScreenBack();

  useFocusEffect(
    useCallback(() => {
      bxLog("screen", "ConfirmScreen focused", { hasEmail: Boolean(email) });
    }, [email]),
  );

  return (
    <Screen keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />

      <PageHeader
        eyebrow="Check your email"
        onBackPress={() => {
          bxLog("screen", "Confirm back");
          back();
        }}
        subtitle={`We emailed a verification code to ${email || "the address you used"}.`}
        title="Verify your email"
      />

      <Card style={styles.form}>
        <Input
          label="Verification code"
          onChangeText={form.setCode}
          placeholder="6-digit code"
          value={form.code}
        />
        {form.error ? <Text style={styles.error}>{form.error}</Text> : null}
        <Button title="Verify and continue" onPress={form.submit} />
      </Card>

      <Text style={[styles.hint, typography.caption]}>
        Codes expire after a short time for security. If no email arrives, wait a minute, check spam folders, or ask your hospital IT desk for help.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  hint: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    fontFamily: typography.caption.fontFamily,
  },
});

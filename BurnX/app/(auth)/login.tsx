import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Input } from "../../src/components/Input";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useLoginForm } from "../../src/lib/auth-forms";
import { bxLog } from "../../src/lib/debug-log";
import { useAuthScreenBack } from "../../src/lib/navigation-helpers";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

export default function LoginScreen() {
  const form = useLoginForm();
  const back = useAuthScreenBack();

  useFocusEffect(
    useCallback(() => {
      bxLog("screen", "LoginScreen focused");
    }, []),
  );

  return (
    <Screen keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />

      <PageHeader
        eyebrow="Sign in"
        onBackPress={() => {
          bxLog("screen", "Login back");
          back();
        }}
        subtitle="Use the email address and password for your NeoTherm account."
        title="Welcome back"
      />

      <Card style={styles.form}>
        <Input
          keyboardType="email-address"
          label="Work or personal email"
          onChangeText={form.setEmail}
          placeholder="you@example.org"
          value={form.email}
        />
        <Input
          label="Password"
          onChangeText={form.setPassword}
          placeholder="Your password"
          secureTextEntry
          value={form.password}
        />
        {form.error ? <Text style={styles.error}>{form.error}</Text> : null}
        <Button title="Sign in" onPress={form.submit} />
      </Card>

      <Text style={[styles.policyNote, typography.caption]}>
        By signing in you agree to HIPAA and your hospital policies, and any agreements between
        your hospital and NeoTherm (including BAAs where they apply).
      </Text>

      <Button
        title="Request access"
        variant="secondary"
        onPress={() => {
          bxLog("screen", "Login → /signup");
          router.push("/signup");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  policyNote: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    fontFamily: typography.caption.fontFamily,
  },
});

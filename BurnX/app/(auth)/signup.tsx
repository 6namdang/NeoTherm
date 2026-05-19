import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Input } from "../../src/components/Input";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { signupEmailHints } from "../../src/constants/auth-ui";
import { useSignupForm } from "../../src/lib/auth-forms";
import { bxLog } from "../../src/lib/debug-log";
import { useAuthScreenBack } from "../../src/lib/navigation-helpers";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

const ROLE_OPTIONS = [
  { value: "patient" as const, label: "Patient" },
  { value: "doctor" as const, label: "Clinician" },
];

export default function SignupScreen() {
  const form = useSignupForm();
  const back = useAuthScreenBack();
  const emailField = signupEmailHints(form.role);

  useFocusEffect(
    useCallback(() => {
      bxLog("screen", "SignupScreen focused");
    }, []),
  );

  return (
    <Screen keyboardAvoid preset="stack" scroll>
      <StatusBar style="dark" />

      <PageHeader
        eyebrow="New account"
        onBackPress={() => {
          bxLog("screen", "Signup back");
          back();
        }}
        subtitle="We use your selection to route you to the right intake and safeguards."
        title="Create your account"
      />

      <Text style={[styles.roleLabel, typography.caption]}>I am a</Text>
      <SegmentedControl onChange={(v) => form.setRole(v)} options={ROLE_OPTIONS} value={form.role} />

      <Card style={styles.form}>
        <Animated.View layout={LinearTransition.springify().damping(26).mass(1)}>
          <Input
            keyboardType="email-address"
            label={emailField.label}
            onChangeText={form.setEmail}
            placeholder={emailField.placeholder}
            value={form.email}
          />
        </Animated.View>
        <Input
          label="Password"
          onChangeText={form.setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          value={form.password}
        />
        {form.error ? <Text style={styles.error}>{form.error}</Text> : null}
        <Button title="Send verification code" onPress={form.submit} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleLabel: {
    color: colors.textSecondary,
    textTransform: "uppercase",
    fontFamily: typography.caption.fontFamily,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    letterSpacing: 0.4,
    fontSize: 11,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    fontFamily: typography.caption.fontFamily,
  },
});

import { Image, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../src/components/Button";
import { Screen } from "../src/components/Screen";
import { TrustFooter } from "../src/components/TrustFooter";
import { bxLog } from "../src/lib/debug-log";
import { colors } from "../src/theme/colors";
import { shadows } from "../src/theme/shadows";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";

export default function WelcomeScreen() {
  useEffect(() => {
    bxLog("screen", "WelcomeScreen focus (mount)");
  }, []);

  return (
    <Screen preset="stack" scroll>
      <StatusBar style="dark" />

      <View style={styles.topMeta}>
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={styles.trustBadgeText}>Hospital-grade privacy and security</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.logoShell}>
          <Image
            source={require("../assets/images/mgh_logo.jpeg")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.eyebrow, typography.eyebrow]}>BurnX for hospitals</Text>
        <Text style={[styles.headline, typography.headlineLarge]}>
          Burn care workflows, calmly organized.
        </Text>
        <Text style={[styles.subtitle, typography.body]}>
          One place for patient onboarding, questionnaires, handoffs to your burn team, using the
          same secure sign-in your organization already trusts.
        </Text>

        <View style={styles.featureStrip}>
          <FeatureRow
            icon="git-network-outline"
            label="Clear next steps"
            helper="Patients and staff see what comes next."
          />
          <FeatureRow
            icon="people-outline"
            label="Built for care teams"
            helper="Keeps nurses, surgeons, and patients aligned."
          />
          <FeatureRow
            icon="lock-closed-outline"
            label="Who did what"
            helper="Important actions can be audited when your hospital turns that on."
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TrustFooter dense message="BurnX supports your care team. It doesn't replace clinicians or decide treatment for you." />
        <View style={{ height: spacing.md }} />
        <Button
          title="Sign in"
          onPress={() => {
            bxLog("screen", "Welcome → /login");
            router.push("/login");
          }}
        />
      </View>
    </Screen>
  );
}

function FeatureRow({
  icon,
  label,
  helper,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  helper: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, typography.bodyStrong]}>{label}</Text>
        <Text style={[styles.rowHelper, typography.caption]}>{helper}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topMeta: {
    alignItems: "center",
    marginBottom: spacing.lg,
    width: "100%",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 100,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "100%",
  },
  trustBadgeText: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: "none",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  hero: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: 0,
  },
  logoShell: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadows.cardRaised,
  },
  logo: {
    width: 80,
    height: 80,
  },
  eyebrow: {
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  headline: {
    color: colors.text,
    textAlign: "center",
    width: "100%",
    maxWidth: 360,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    width: "100%",
    maxWidth: 360,
    marginBottom: spacing.xl,
    flexShrink: 1,
  },
  featureStrip: {
    width: "100%",
    maxWidth: 400,
    gap: spacing.sm,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: {
    color: colors.text,
    marginBottom: 2,
  },
  rowHelper: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    width: "100%",
    marginTop: spacing.xl,
    paddingTop: spacing.sm,
  },
});

import { Image, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const startedRef = useRef(false);

  useEffect(() => {
    bxLog("screen", "WelcomeScreen focus (mount)");
    if (startedRef.current) return;
    startedRef.current = true;
    opacity.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [opacity, scale]);

  const logoMotion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Screen preset="stack" scroll>
      <StatusBar style="dark" />

      <View style={styles.topMeta}>
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={styles.trustBadgeText}>Hospital grade privacy and security</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Animated.View style={[styles.logoShell, logoMotion]}>
          <Image
            source={require("../assets/images/mgh_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={styles.appTitle}>NeoTherm</Text>
        <Text style={[styles.eyebrow, typography.eyebrow]}>NeoTherm for hospitals</Text>
        <Text style={[styles.headline, typography.headlineLarge]}>
          Burn care workflows, calmly organized.
        </Text>
        <Text style={[styles.subtitle, typography.body]}>
          One place for patient onboarding, questionnaires, and handoffs to your
          burn team, using the same secure sign in your organization already trusts.
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

      <View style={styles.collaboration}>
        <Text style={[styles.collabLabel, typography.micro]}>
          In collaboration between
        </Text>
        <Text style={[styles.collabText, typography.caption]}>
          Massachusetts General Brigham, Spaulding Rehabilitation Hospital and
          Harvard Medical School
        </Text>
        <View style={styles.logoRow}>
          <PartnerLogo
            accessibilityLabel="Spaulding Rehabilitation Hospital logo"
            source={require("../assets/images/spauldinglogo.png")}
          />
          <PartnerLogo
            accessibilityLabel="Harvard Medical School logo"
            source={require("../assets/images/harvardmedlogo.png")}
          />
          <PartnerLogo
            accessibilityLabel="Massachusetts General Brigham logo"
            source={require("../assets/images/mgh_logo.png")}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TrustFooter dense message="NeoTherm supports your care team. It does not replace clinicians or decide treatment for you." />
        <View style={{ height: spacing.md }} />
        <Button
          title="Sign in"
          onPress={() => {
            bxLog("screen", "Welcome to login");
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

function PartnerLogo({
  accessibilityLabel,
  source,
}: {
  accessibilityLabel: string;
  source: ComponentProps<typeof Image>["source"];
}) {
  return (
    <View style={styles.logoTile}>
      <Image
        accessibilityLabel={accessibilityLabel}
        source={source}
        style={styles.partnerLogo}
        resizeMode="contain"
      />
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
    width: 138,
    height: 138,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.cardRaised,
  },
  logo: {
    width: 100,
    height: 100,
  },
  appTitle: {
    ...typography.headlineLarge,
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.7,
    marginBottom: spacing.sm,
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
    maxWidth: 380,
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
  collaboration: {
    width: "100%",
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  collabLabel: {
    color: colors.primary,
    textTransform: "uppercase",
    textAlign: "center",
  },
  collabText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  logoTile: {
    flex: 1,
    height: 78,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  partnerLogo: {
    width: "100%",
    height: 62,
  },
  footer: {
    width: "100%",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
});

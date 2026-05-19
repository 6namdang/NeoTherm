import { Stack, usePathname, useSegments } from "expo-router";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider, useToast } from "../src/components/ToastProvider";
import { FontsProvider } from "../src/providers/FontsProvider";
import { SessionProvider, useSession } from "../src/lib/auth-context";
import { bxLog } from "../src/lib/debug-log";
import { PostAuthProvider, usePostAuth } from "../src/lib/post-auth-context";
import { hasConsented } from "../src/lib/consent";
import { ConsentGateProvider } from "../src/lib/consent-gate-context";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";

const rootStackPresentation = Platform.select({
  ios: {
    gestureEnabled: true,
    animation: "default" as const,
    fullScreenGestureEnabled: true,
    animationMatchesGesture: true,
    animationDuration: 380,
  },
  default: {
    gestureEnabled: true,
    animation: "ios_from_right" as const,
    animationDuration: 300,
  },
});

/** Softer passage from landing into sign-in vs default horizontal push */
const landingToAuthPresentation = Platform.select({
  ios: {
    animation: "fade_from_bottom" as const,
    animationDuration: 440,
    gestureEnabled: true,
    gestureDirection: "vertical" as const,
    fullScreenGestureEnabled: true,
    animationMatchesGesture: true,
  },
  default: {
    gestureEnabled: true,
    animation: "fade_from_bottom" as const,
    animationDuration: 360,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FontsProvider>
        <SessionProvider>
          <PostAuthProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </PostAuthProvider>
        </SessionProvider>
      </FontsProvider>
    </SafeAreaProvider>
  );
}

function NavigationLogger() {
  const pathname = usePathname();
  const segments = useSegments();
  useEffect(() => {
    bxLog("nav", "route", { pathname, segments: [...segments] });
  }, [pathname, segments]);
  return null;
}

function RootNavigator() {
  const { isLoading, session, role } = useSession();
  const { ready: postAuthReady, needsOnboarding } = usePostAuth();
  const { showToast } = useToast();

  type ConsentGateState = "inactive" | "loading" | "required" | "complete";
  const [consentState, setConsentState] = useState<ConsentGateState>("inactive");

  const patientEligibleShell = Boolean(
    session && postAuthReady && !needsOnboarding && role === "patient",
  );
  const doctorEligibleShell = Boolean(
    session && postAuthReady && !needsOnboarding && role === "doctor",
  );
  /** Study consent modal applies to patients only; doctors enter the clinician shell without it. */
  const eligibleForConsent = patientEligibleShell;

  const markConsentRecorded = useCallback(() => {
    setConsentState("complete");
    bxLog("consent", "marked recorded locally");
  }, []);

  useEffect(() => {
    if (!eligibleForConsent) {
      setConsentState("inactive");
      return;
    }

    let cancelled = false;
    setConsentState("loading");
    void (async () => {
      try {
        const ok = await hasConsented();
        if (!cancelled) setConsentState(ok ? "complete" : "required");
      } catch (err) {
        bxLog("consent", "hasConsented failed", {
          message: err instanceof Error ? err.message : String(err),
        });
        showToast(
          "Unable to verify your study agreement status. Tap Accept after reading the screens, or log out and sign in again.",
          "error",
        );
        if (!cancelled) setConsentState("required");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eligibleForConsent, showToast]);

  const bootstrapping = isLoading || (session && !postAuthReady);
  /** JWT role missing yet PostAuth considers onboarding finished — rare; avoid mounting wrong shell. */
  const waitingResolvedRole =
    session &&
    postAuthReady &&
    !needsOnboarding &&
    role === null;

  const consentBoot =
    eligibleForConsent && consentState === "loading";
  const showLoading = bootstrapping || waitingResolvedRole || consentBoot;

  useEffect(() => {
    let visibleStack =
      showLoading ? "loading" : !session
        ? "public+auth"
        : needsOnboarding
          ? "onboarding"
          : consentState === "required"
            ? "consent-modal"
            : role === "doctor"
              ? "app-doctor"
              : "app";
    if (eligibleForConsent && consentState === "complete") {
      visibleStack = role === "doctor" ? "app-doctor" : "app";
    }
    bxLog("gate", "RootNavigator", {
      isLoading,
      session,
      role,
      postAuthReady,
      needsOnboarding,
      bootstrapping,
      waitingResolvedRole,
      consentState,
      consentBoot,
      showLoading,
      visibleStack,
    });
  }, [
    bootstrapping,
    consentBoot,
    consentState,
    eligibleForConsent,
    isLoading,
    needsOnboarding,
    postAuthReady,
    role,
    session,
    showLoading,
    waitingResolvedRole,
  ]);

  const consentModalGate = Boolean(
    eligibleForConsent && consentState === "required",
  );
  const patientAppGate = Boolean(
    patientEligibleShell && consentState === "complete",
  );
  const doctorAppGate = Boolean(doctorEligibleShell);

  return (
    <Fragment>
      <NavigationLogger />
      {showLoading ? (
        <View style={styles.loadingScreen}>
          <View style={styles.loadingStrip} />
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingLabel, typography.caption]}>
            {consentBoot ? "Preparing your workspace…" : "Signing you in…"}
          </Text>
        </View>
      ) : (
        <ConsentGateProvider markConsentRecorded={markConsentRecorded}>
          <Stack screenOptions={{ headerShown: false, ...rootStackPresentation }}>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={landingToAuthPresentation ?? {}} />
            </Stack.Protected>
            <Stack.Protected guard={Boolean(session && needsOnboarding)}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>
            <Stack.Protected guard={consentModalGate}>
              <Stack.Screen name="(modal)" />
            </Stack.Protected>
            <Stack.Protected guard={patientAppGate}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={doctorAppGate}>
              <Stack.Screen name="(app-doctor)" />
            </Stack.Protected>
          </Stack>
        </ConsentGateProvider>
      )}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  loadingLabel: {
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});

import { useNavigation } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback } from "react";
import { useSession } from "./auth-context";

/**
 * Login / signup / confirm: pop the stack when possible; otherwise show welcome (`/`).
 * Use when the user is not in the post-auth onboarding shell.
 */
export function useAuthScreenBack() {
  const navigation = useNavigation();
  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/" as Href);
    }
  }, [navigation]);
}

/**
 * After Cognito signup, `replaceRouteAfterAuthentication` often replaces the auth stack so there is
 * nothing to pop — `router.back()` is a no-op. Sign out and reset to welcome so "Back" reliably
 * exits onboarding (clinician and patient).
 */
export function useOnboardingBack() {
  const navigation = useNavigation();
  const { signOut } = useSession();
  return useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      await signOut();
      router.replace("/" as Href);
    }
  }, [navigation, signOut]);
}

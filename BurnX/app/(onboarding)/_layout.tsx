import { Stack } from "expo-router";
import { Platform } from "react-native";
import { OnboardingProvider } from "../../src/state/onboarding-context";

const onboardingStackPresentation = Platform.select({
  ios: {
    gestureEnabled: true,
    animation: "default" as const,
    fullScreenGestureEnabled: true,
    animationMatchesGesture: true,
    animationDuration: 360,
  },
  default: {
    gestureEnabled: true,
    animation: "ios_from_right" as const,
    animationDuration: 300,
  },
});

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          ...onboardingStackPresentation,
        }}
      />
    </OnboardingProvider>
  );
}

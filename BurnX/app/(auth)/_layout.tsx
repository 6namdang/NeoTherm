import { Stack } from "expo-router";
import { Platform } from "react-native";

const authStackPresentation = Platform.select({
  ios: {
    gestureEnabled: true,
    animation: "default" as const,
    fullScreenGestureEnabled: true,
    animationMatchesGesture: true,
    animationDuration: 340,
  },
  default: {
    gestureEnabled: true,
    animation: "ios_from_right" as const,
    animationDuration: 275,
  },
});

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, ...authStackPresentation }} />;
}

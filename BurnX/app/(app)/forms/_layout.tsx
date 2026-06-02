import { Stack } from "expo-router";

export default function FormsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="voice-checkin" options={{ headerShown: false }} />
      <Stack.Screen name="moca" options={{ headerShown: false }} />
      <Stack.Screen name="long-assessment" options={{ headerShown: false }} />
      <Stack.Screen name="[formId]" options={{ headerShown: false }} />
    </Stack>
  );
}

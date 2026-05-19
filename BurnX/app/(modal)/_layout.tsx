import { Stack } from "expo-router";

export default function ModalLayout() {
  return (
    <Stack
      initialRouteName="consent"
      screenOptions={{
        presentation: "modal",
        headerShown: false,
      }}
    >
      <Stack.Screen name="consent" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

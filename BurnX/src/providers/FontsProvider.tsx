import * as SplashScreen from "expo-splash-screen";
import { type PropsWithChildren, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { colors } from "../theme/colors";

void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Loads Inter; typography references these PostScript names. */
export function FontsProvider({ children }: PropsWithChildren) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={styles.bootShell}>
        <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} size="large" />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  bootShell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});

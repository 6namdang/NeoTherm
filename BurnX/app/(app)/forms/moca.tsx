import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";

/** MoCA v1 runs inside the Long Assessment bundle — redirect legacy deep links. */
export default function MocaRedirectScreen() {
  useEffect(() => {
    router.replace("/forms/long-assessment" as Href);
  }, []);

  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
});

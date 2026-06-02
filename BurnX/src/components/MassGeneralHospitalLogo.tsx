import { Image, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

const HEADER_RULE = "#E2E8F0";

/** Full-width institutional header band — white field with a crisp bottom rule. */
export function MassGeneralHospitalLogo() {
  return (
    <View style={styles.bar}>
      <View
        accessibilityLabel="Massachusetts General Hospital"
        accessibilityRole="image"
        style={styles.logoFrame}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={require("../../assets/images/MassGeneralLogo.jpg")}
          style={styles.logo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: -spacing.xl,
    marginTop: -spacing.xl + spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: HEADER_RULE,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 4,
    width: undefined,
    alignSelf: "stretch",
  },
  logoFrame: {
    width: "100%",
    minHeight: 56,
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: 56,
  },
});

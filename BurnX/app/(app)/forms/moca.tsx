import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { MocaFormRunner } from "../../../src/components/forms/moca/MocaFormRunner";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { useToast } from "../../../src/components/ToastProvider";
import { MOCA_FORM, isMocaStandaloneTestingEnabled } from "../../../src/constants/forms/moca";
import { careProgramsTabHrefForFormId } from "../../../src/lib/care-program-form-groups";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";

export default function MocaScreen() {
  const { showToast } = useToast();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (!isMocaStandaloneTestingEnabled()) {
      router.replace("/forms/long-assessment" as Href);
    }
  }, []);

  if (!isMocaStandaloneTestingEnabled()) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Screen animateEntry preset="stack" scroll scrollEnabled={scrollEnabled}>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Assessment"
        title="MoCA"
        onBackPress={() => router.replace(careProgramsTabHrefForFormId(MOCA_FORM.id))}
      />
      <MocaFormRunner
        onParentScrollEnabledChange={setScrollEnabled}
        onSubmitted={async () => {
          showToast("MoCA saved to your account.", "success");
          router.replace(careProgramsTabHrefForFormId(MOCA_FORM.id));
        }}
      />
    </Screen>
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

import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppleHealthStepsHistoryPoint } from "../../lib/healthkit";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { ChartShell } from "../charts/ui/ChartShell";
import { AnimatedStepsLineChart } from "../charts/ui/AnimatedStepsLineChart";

type AppleHealthStepsModalProps = {
  visible: boolean;
  history: AppleHealthStepsHistoryPoint[];
  onClose: () => void;
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function average(points: AppleHealthStepsHistoryPoint[]): number {
  if (points.length === 0) return 0;
  return Math.round(
    points.reduce((sum, point) => sum + point.steps, 0) / points.length,
  );
}

export function AppleHealthStepsModal({
  visible,
  history,
  onClose,
}: AppleHealthStepsModalProps) {
  const insets = useSafeAreaInsets();
  const avg = average(history);

  return (
    <Modal
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            paddingTop: Platform.OS === "ios" ? insets.top + spacing.md : spacing.lg,
          },
        ]}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, typography.micro]}>Apple Health</Text>
              <Text style={[styles.title, typography.headlineMedium]}>
                Steps History
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close steps history"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={26} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ChartShell
              description="Last 7 days from Apple Health on this device."
              title="Daily steps"
            >
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{formatInteger(avg)}</Text>
                <Text style={[styles.summaryUnit, typography.caption]}>
                  average steps per day
                </Text>
              </View>
              <AnimatedStepsLineChart history={history} />
            </ChartShell>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    flex: 1,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.systemGreen,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
  },
  summaryRow: {
    gap: 2,
  },
  summaryValue: {
    ...typography.headlineLarge,
    color: colors.text,
    letterSpacing: -0.8,
  },
  summaryUnit: {
    color: colors.textSecondary,
  },
});

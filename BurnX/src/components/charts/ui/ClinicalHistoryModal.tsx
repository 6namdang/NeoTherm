import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import { AnimatedClinicalLineChart } from "./AnimatedClinicalLineChart";

export type ClinicalHistoryPoint = {
  createdAtIso: string;
  value: number;
};

type ClinicalHistoryModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  caption: string;
  points: ClinicalHistoryPoint[];
  maxValue: number;
  lineColor: string;
  gradientId: string;
  lowerIsBetter?: boolean;
  unit?: string;
  valueFormatter?: (value: number) => string;
};

function formatTickDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function ClinicalHistoryModal({
  visible,
  onClose,
  title,
  subtitle,
  caption,
  points,
  maxValue,
  lineColor,
  gradientId,
  lowerIsBetter = false,
  unit,
  valueFormatter,
}: ClinicalHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const chronological = useMemo(
    () =>
      [...points].sort(
        (a, b) => Date.parse(a.createdAtIso) - Date.parse(b.createdAtIso),
      ),
    [points],
  );
  const values = chronological.map((point) => point.value);
  const labels = chronological.map((point) => formatTickDate(point.createdAtIso));
  const animateKey = `${points.length}-${points[0]?.createdAtIso ?? "empty"}`;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      visible={visible}
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
              <Text style={[styles.eyebrow, typography.micro]}>{subtitle}</Text>
              <Text style={[styles.title, typography.headlineMedium]}>{title}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close history"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={26} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.caption, typography.caption]}>{caption}</Text>
            {lowerIsBetter ? (
              <Text style={[styles.hint, typography.caption]}>
                Lower values generally mean less burden for this measure.
              </Text>
            ) : null}
            {values.length === 0 ? (
              <Text style={[styles.empty, typography.body]}>
                Complete more check-ins to build this history chart.
              </Text>
            ) : (
              <AnimatedClinicalLineChart
                animateKey={animateKey}
                gradientId={gradientId}
                interactive
                labels={labels}
                lineColor={lineColor}
                maxValue={maxValue}
                unit={unit}
                valueFormatter={valueFormatter}
                values={values}
              />
            )}
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
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
  },
  caption: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});

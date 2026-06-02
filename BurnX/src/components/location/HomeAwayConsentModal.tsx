import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
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

import type { HomeLocationConsentChecks } from "../../lib/home-location-consent";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "../Button";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccepted: () => void;
};

const CHECKS: {
  id: keyof HomeLocationConsentChecks;
  label: string;
}[] = [
  {
    id: "understandsNoRouteHistory",
    label: "I understand NeoTherm will not store route history, maps, pins, or repeated GPS trails for this feature.",
  },
  {
    id: "understandsHomeBoundary",
    label: "I understand NeoTherm uses the home address I enter to set a boundary and estimate time inside or outside that area.",
  },
  {
    id: "understandsLocalDelete",
    label: "I understand I can clear my home/away history from this device.",
  },
  {
    id: "agreesToTracking",
    label: "I agree to enable home/away tracking for recovery context.",
  },
];

export function HomeAwayConsentModal({ visible, onClose, onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [checks, setChecks] = useState<HomeLocationConsentChecks>({
    understandsNoRouteHistory: false,
    understandsHomeBoundary: false,
    understandsLocalDelete: false,
    agreesToTracking: false,
  });

  const requiredOk = useMemo(
    () => CHECKS.every((item) => checks[item.id] === true),
    [checks],
  );

  async function accept() {
    if (!requiredOk || submitting) return;
    setSubmitting(true);
    try {
      onAccepted();
    } finally {
      setSubmitting(false);
    }
  }

  const body = (
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
          <View style={styles.icon}>
            <Ionicons color={colors.primary} name="shield-checkmark-outline" size={26} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, typography.micro]}>Location consent</Text>
            <Text style={[styles.title, typography.title]}>
              Enable home/away estimates
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close location consent"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
          >
            <Ionicons color={colors.textMuted} name="close" size={24} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.copy, typography.body]}>
            NeoTherm can estimate how much of each day is spent at home or outside
            home using low-power home boundary events. This is recovery context,
            not a diagnostic score.
          </Text>
          <Text style={[styles.copy, typography.body]}>
            NeoTherm does not visualize routes and does not store repeated GPS trails
            for this feature. Daily summaries remain estimated because iOS may
            delay background boundary events.
          </Text>

          <View style={styles.checks}>
            {CHECKS.map((item) => {
              const checked = checks[item.id];
              return (
                <Pressable
                  accessibilityLabel={item.label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  key={item.id}
                  onPress={() =>
                    setChecks((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  style={({ pressed }) => [
                    styles.checkRow,
                    checked && styles.checkRowOn,
                    pressed && styles.checkRowPressed,
                  ]}
                >
                  <View style={[styles.box, checked && styles.boxOn]}>
                    {checked ? (
                      <Ionicons color={colors.textOnPrimary} name="checkmark" size={16} />
                    ) : null}
                  </View>
                  <Text style={[styles.checkLabel, typography.body]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            disabled={!requiredOk || submitting}
            title={
              submitting ? "Saving…" : "Agree & Continue"
            }
            onPress={() => void accept()}
          />
          <Button
            disabled={submitting}
            title="Not now"
            variant="ghost"
            onPress={onClose}
          />
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      visible={visible}
      onRequestClose={onClose}
    >
      {body}
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
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    color: colors.text,
  },
  copy: {
    color: colors.textSecondary,
    lineHeight: 25,
    marginBottom: spacing.md,
  },
  checks: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkRow: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  checkRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  checkRowPressed: {
    opacity: 0.82,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkLabel: {
    flex: 1,
    color: colors.text,
    lineHeight: 24,
  },
  actions: {
    gap: spacing.sm,
  },
});

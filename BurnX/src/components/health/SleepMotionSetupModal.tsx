import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Button } from "../Button";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccepted: () => void | Promise<void>;
};

export function SleepMotionSetupModal({ visible, onClose, onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  async function accept() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAccepted();
    } finally {
      setSubmitting(false);
    }
  }

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
            <View style={styles.icon}>
              <Ionicons color={colors.primary} name="moon-outline" size={26} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, typography.micro]}>Sleep estimates</Text>
              <Text style={[styles.title, typography.title]}>
                Enable movement check
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close sleep motion setup"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={24} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.copy, typography.body]}>
              NeoTherm estimates sleep from phone lock time at home after 7 PM. When
              you unlock in the morning, iOS shares a short step count for that
              window so NeoTherm can confirm you were resting.
            </Text>
            <Text style={[styles.copy, typography.body]}>
              Step counts are used only for this check. They are not stored or sent
              to a server.
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              disabled={submitting}
              title={submitting ? "Saving…" : "Allow Motion Access"}
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
  actions: {
    gap: spacing.sm,
  },
});

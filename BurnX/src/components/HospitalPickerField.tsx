import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Hospital } from "../constants/hospitals";
import { hospitals } from "../constants/hospitals";
import { bxLog } from "../lib/debug-log";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type HospitalPickerFieldProps = {
  label: string;
  required?: boolean;
  helpText?: string;
  value: string;
  onChange: (hospitalId: string) => void;
};

function HospitalLogo({
  uri,
  size,
}: {
  uri: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !uri) {
    return (
      <View style={[styles.logoFallback, { width: size, height: size }]}>
        <Ionicons color={colors.primary} name="business" size={size * 0.45} />
      </View>
    );
  }
  return (
    <Image
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
      resizeMode="contain"
      source={{ uri }}
      style={[styles.logoImage, { width: size, height: size }]}
    />
  );
}

export function HospitalPickerField({
  label,
  required,
  helpText,
  value,
  onChange,
}: HospitalPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selected = useMemo(
    () => hospitals.find((h) => h.id === value),
    [value],
  );

  function selectHospital(h: Hospital) {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    bxLog("field", "HospitalPicker select", { id: h.id });
    onChange(h.id);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {helpText ? <Text style={styles.help}>{helpText}</Text> : null}

      <Pressable
        accessibilityLabel={selected ? `${label}, ${selected.name}` : label}
        accessibilityRole="button"
        onPress={() => {
          bxLog("field", "HospitalPicker open");
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <View style={styles.triggerInner}>
          {selected ? (
            <>
              <HospitalLogo size={36} uri={selected.logoUrl} />
              <View style={styles.triggerTextBlock}>
                <Text numberOfLines={2} style={styles.triggerTitle}>
                  {selected.name}
                </Text>
                <Text numberOfLines={1} style={styles.triggerSubtitle}>
                  {selected.address}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.triggerPlaceholder}>Select hospital…</Text>
          )}
        </View>
        <Ionicons color={colors.textMuted} name="chevron-down" size={22} />
      </Pressable>

      <Modal
        animationType="slide"
        presentationStyle={
          Platform.OS === "ios" ? "pageSheet" : "fullScreen"
        }
        visible={open}
        onRequestClose={() => {
          bxLog("field", "HospitalPicker close (onRequestClose)");
          setOpen(false);
        }}
      >
        <View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {Platform.OS === "ios" ? (
            <View accessibilityElementsHidden style={styles.grabberWrap}>
              <View style={styles.grabber} />
            </View>
          ) : null}
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityLabel="Cancel"
              hitSlop={12}
              onPress={() => {
                bxLog("field", "HospitalPicker cancel");
                setOpen(false);
              }}
              style={({ pressed }) => pressed && styles.headerBtnPressed}
            >
              <Text style={styles.headerCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Choose hospital</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            contentContainerStyle={styles.listContent}
            data={hospitals}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isOn = item.id === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isOn }}
                  onPress={() => selectHospital(item)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <HospitalLogo size={44} uri={item.logoUrl} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text numberOfLines={2} style={styles.rowMeta}>
                      {item.address}
                    </Text>
                  </View>
                  {isOn ? (
                    <Ionicons
                      color={colors.primary}
                      name="checkmark-circle"
                      size={26}
                    />
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    fontSize: 11,
  },
  help: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "none",
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  triggerPressed: {
    opacity: 0.92,
    backgroundColor: colors.surfaceMuted,
  },
  triggerInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  triggerTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  triggerTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
  },
  triggerSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: "none",
  },
  triggerPlaceholder: {
    ...typography.body,
    fontSize: 16,
    color: colors.textMuted,
  },
  logoImage: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  logoFallback: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    flex: 1,
    backgroundColor:
      Platform.OS === "ios" ? colors.backgroundAlt : colors.surface,
  },
  grabberWrap: {
    alignItems: "center",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerCancel: {
    ...typography.body,
    fontSize: 17,
    color: colors.primary,
    fontWeight: "400",
  },
  headerTitle: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 56,
  },
  headerBtnPressed: {
    opacity: 0.55,
  },
  list: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.overlay,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowMeta: {
    ...typography.caption,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 19,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 44 + spacing.md,
    backgroundColor: colors.border,
  },
  checkSpacer: {
    width: 26,
  },
});

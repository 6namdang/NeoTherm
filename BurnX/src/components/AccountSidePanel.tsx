import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

const IOS_SEPARATOR = "rgba(60, 60, 67, 0.12)";
const IOS_MUTED = "#8E8E93";
const IOS_AVATAR_BG = "#E6F1FB";
const IOS_AVATAR_ICON = "#185FA5";
const IOS_DESTRUCTIVE = "#FF3B30";
const GROUP_RADIUS = 16;

type AccountSidePanelProps = {
  visible: boolean;
  displayName: string;
  roleLabel: string;
  facility?: string | null;
  role?: string | null;
  onClose: () => void;
  onSettings: () => void;
  onSignOut: () => void;
};

function titleCaseRole(role: string): string {
  const t = role.trim();
  if (t === "") return "";
  return t
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildIdentitySubline(role?: string | null, facility?: string | null): string | null {
  const parts: string[] = [];
  const roleText = typeof role === "string" ? titleCaseRole(role) : "";
  const facilityText = typeof facility === "string" ? facility.trim() : "";
  if (roleText !== "") parts.push(roleText);
  if (facilityText !== "") parts.push(facilityText);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AccountSidePanel({
  visible,
  displayName,
  roleLabel,
  facility,
  role,
  onClose,
  onSettings,
  onSignOut,
}: AccountSidePanelProps) {
  const insets = useSafeAreaInsets();
  const identitySubline = buildIdentitySubline(role, facility) ?? roleLabel;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close account menu"
          accessibilityRole="button"
          style={styles.backdrop}
          onPress={onClose}
        />
        <View
          style={[
            styles.panel,
            {
              paddingTop: Math.max(insets.top, spacing.lg),
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Ionicons color={IOS_AVATAR_ICON} name="person" size={24} />
            </View>
            <View style={styles.identity}>
              <Text style={[styles.name, typography.title]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.identitySubline} numberOfLines={2}>
                {identitySubline}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close account menu"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={24} />
            </Pressable>
          </View>

          <View style={styles.group}>
            <PanelAction
              icon="settings-outline"
              label="Settings"
              helper="Edit your personal information"
              onPress={onSettings}
              showSeparatorBelow
            />
            <PanelAction
              destructive
              icon="log-out-outline"
              label="Sign out"
              helper="Lock this device session"
              onPress={onSignOut}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PanelAction({
  icon,
  label,
  helper,
  destructive,
  showSeparatorBelow,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  destructive?: boolean;
  showSeparatorBelow?: boolean;
  onPress: () => void;
}) {
  const accent = destructive ? IOS_DESTRUCTIVE : IOS_AVATAR_ICON;
  const iconBg = destructive ? "rgba(255, 59, 48, 0.12)" : IOS_AVATAR_BG;

  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          pressed && { opacity: Platform.OS === "ios" ? 0.78 : 0.9 },
        ]}
      >
        <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
          <Ionicons color={accent} name={icon} size={22} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionLabel, destructive && { color: IOS_DESTRUCTIVE }]}>
            {label}
          </Text>
          {helper ? (
            <Text style={[styles.actionHelper, typography.caption]}>{helper}</Text>
          ) : null}
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      </Pressable>
      {showSeparatorBelow ? <View style={styles.separator} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  panel: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
    borderTopLeftRadius: GROUP_RADIUS,
    borderBottomLeftRadius: GROUP_RADIUS,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: -8, height: 0 },
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: IOS_AVATAR_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
  },
  identitySubline: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: IOS_MUTED,
    fontWeight: "400",
    ...Platform.select({
      ios: { fontFamily: undefined },
      default: {},
    }),
  },
  group: {
    borderRadius: GROUP_RADIUS,
    overflow: "hidden",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IOS_SEPARATOR,
  },
  action: {
    minHeight: 72,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: spacing.md + 42 + spacing.md,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  actionHelper: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});

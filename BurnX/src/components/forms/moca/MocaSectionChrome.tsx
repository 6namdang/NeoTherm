import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../Button";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";

export function MocaSectionRoot({ children }: PropsWithChildren) {
  return <View style={styles.root}>{children}</View>;
}

export function MocaSectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

export function MocaTaskPrompt({ children }: PropsWithChildren) {
  return <Text style={[styles.prompt, typography.body]}>{children}</Text>;
}

export function MocaTaskCaption({ children }: PropsWithChildren) {
  return <Text style={[styles.caption, typography.caption]}>{children}</Text>;
}

export function MocaTaskFrame({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.frame, style]}>{children}</View>;
}

export function MocaTaskFooter({ children }: PropsWithChildren) {
  return <View style={styles.footer}>{children}</View>;
}

export function MocaCompactButton({
  style,
  ...props
}: ComponentProps<typeof Button>) {
  return <Button {...props} style={[styles.compactBtn, style]} />;
}

export function MocaTaskActionRow({ children }: PropsWithChildren) {
  return <View style={styles.actionRow}>{children}</View>;
}

export function MocaTaskLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={[styles.linkText, typography.caption]}>{label}</Text>
    </Pressable>
  );
}

export function MocaInlineNote({ children }: PropsWithChildren) {
  return <Text style={[styles.note, typography.caption]}>{children}</Text>;
}

export function MocaVoiceStatus({
  label,
  body,
  footer,
}: {
  label: string;
  body: string;
  footer?: string;
}) {
  return (
    <View style={styles.statusBlock}>
      <Text style={[styles.statusLabel, typography.caption]}>{label}</Text>
      <Text style={[styles.statusBody, typography.body]}>{body}</Text>
      {footer ? <Text style={[styles.statusFooter, typography.caption]}>{footer}</Text> : null}
    </View>
  );
}

export function MocaInlineAlert({ message }: { message: string }) {
  return (
    <View style={styles.alert}>
      <Text style={[styles.alertText, typography.caption]}>{message}</Text>
    </View>
  );
}

export function MocaVoiceRingZone({ children }: { children: ReactNode }) {
  return <View style={styles.ringZone}>{children}</View>;
}

/** Memory-only soft panel — visually distinct from visuospatial bordered frames. */
export function MocaMemoryPanel({ children }: PropsWithChildren) {
  return <View style={styles.memoryPanel}>{children}</View>;
}

export function MocaMemoryListenRow({ cue }: { cue: string }) {
  return (
    <View style={styles.listenRow}>
      <View style={styles.listenIcon}>
        <Ionicons color={colors.primaryForeground} name="volume-high" size={18} />
      </View>
      <Text style={[typography.body, styles.listenCopy]}>{cue}</Text>
    </View>
  );
}

export function MocaMemoryDelayRow({ countdown }: { countdown: string }) {
  return (
    <View style={styles.delayRow}>
      <Text style={styles.delayCountdown}>{countdown}</Text>
      <Text style={[typography.caption, styles.delayCaption]}>Until delayed recall</Text>
    </View>
  );
}

export function MocaMemoryRecordingRow() {
  return (
    <View style={styles.recordingRow}>
      <View style={styles.recordingDot} />
      <Text style={[typography.caption, styles.recordingLabel]}>Recording your response…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionHeaderText: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  prompt: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  caption: {
    color: colors.textMuted,
    textAlign: "center",
  },
  frame: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  footer: {
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  compactBtn: {
    alignSelf: "center",
    minHeight: 40,
    minWidth: 168,
    paddingHorizontal: spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    width: "100%",
  },
  link: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  note: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  statusBlock: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusLabel: {
    color: colors.textMuted,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  statusBody: {
    color: colors.text,
    lineHeight: 24,
  },
  statusFooter: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  alert: {
    backgroundColor: colors.warningSoft,
    borderColor: "#F0DEB8",
    borderRadius: radius.sm,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  alertText: {
    color: colors.warning,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
  ringZone: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    width: "100%",
  },
  memoryPanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
    width: "100%",
  },
  listenRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listenIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  listenCopy: {
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  delayRow: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  delayCountdown: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  delayCaption: {
    color: colors.textMuted,
    textAlign: "center",
  },
  recordingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  recordingDot: {
    backgroundColor: colors.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  recordingLabel: {
    color: colors.danger,
    fontFamily: fontFamily.semiBold,
  },
});

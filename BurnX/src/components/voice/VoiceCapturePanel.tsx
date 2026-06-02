import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "../../theme/colors";
import { fontFamily } from "../../theme/fontFamily";
import { shadows } from "../../theme/shadows";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { VoiceCaptureRing, type VoiceCaptureRingProps } from "./VoiceCaptureRing";

export type VoiceCaptureMetaChip = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export type VoiceCapturePanelProps = {
  badge: string;
  title: string;
  instruction: string;
  metaChips?: readonly VoiceCaptureMetaChip[];
  /** Image or other stimulus shown above the capture ring. */
  stimulus?: ReactNode;
  ring: VoiceCaptureRingProps;
  /** Transcript, alerts, etc. rendered below the ring inside the panel. */
  children?: ReactNode;
  /** Primary actions rendered below the panel card. */
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function VoiceCapturePanel({
  badge,
  title,
  instruction,
  metaChips,
  stimulus,
  ring,
  children,
  actions,
  style,
}: VoiceCapturePanelProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.panel, shadows.cardRaised]}>
        <View style={styles.accentBar} />

        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={[typography.micro, styles.badgeText]}>{badge}</Text>
          </View>
          <Text style={[typography.headlineMedium, styles.title]}>{title}</Text>
          <Text style={[typography.body, styles.instruction]}>{instruction}</Text>

          {metaChips && metaChips.length > 0 ? (
            <View style={styles.metaRow}>
              {metaChips.map((chip) => (
                <View key={chip.label} style={styles.metaChip}>
                  <Ionicons color={colors.primary} name={chip.icon} size={14} />
                  <Text style={[typography.caption, styles.metaChipText]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {stimulus ? <View style={styles.stimulusSlot}>{stimulus}</View> : null}

        <View style={styles.captureZone}>
          <VoiceCaptureRing {...ring} />
        </View>

        {children ? <View style={styles.footerSlot}>{children}</View> : null}
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

/** MoCA-style section label (e.g. NAMING, VISUOSPATIAL / EXECUTIVE). */
export function VoiceTaskSectionHeader({ label }: { label: string }) {
  return (
    <View style={sectionStyles.bar}>
      <Text style={sectionStyles.label}>{label}</Text>
    </View>
  );
}

export function VoiceCaptureTranscriptCard({
  label,
  body,
  footer,
}: {
  label: string;
  body: string;
  footer?: string;
}) {
  return (
    <View style={styles.transcriptCard}>
      <Text style={[typography.micro, styles.transcriptLabel]}>{label}</Text>
      <Text style={[typography.body, styles.transcriptBody]}>{body}</Text>
      {footer ? (
        <Text style={[typography.caption, styles.transcriptFooter]}>{footer}</Text>
      ) : null}
    </View>
  );
}

export function VoiceCaptureAlert({ message }: { message: string }) {
  return (
    <View style={styles.alert}>
      <Ionicons color={colors.warning} name="alert-circle-outline" size={18} />
      <Text style={[typography.caption, styles.alertText]}>{message}</Text>
    </View>
  );
}

export function VoiceCaptureActionRow({ children }: PropsWithChildren) {
  return <View style={styles.actionRow}>{children}</View>;
}

const sectionStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    width: "100%",
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.primary,
    width: "100%",
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    letterSpacing: -0.4,
  },
  instruction: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  metaChipText: {
    color: colors.textSecondary,
  },
  stimulusSlot: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    overflow: "hidden",
  },
  captureZone: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  footerSlot: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  transcriptCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: spacing.xs,
    paddingLeft: spacing.md,
  },
  transcriptLabel: {
    color: colors.textMuted,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  transcriptBody: {
    color: colors.text,
    lineHeight: 24,
  },
  transcriptFooter: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "#F0DEB8",
  },
  alertText: {
    color: colors.warning,
    flex: 1,
    fontFamily: fontFamily.medium,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    width: "100%",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
});

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import {
  formatPatientIntakeSubmittedAt,
  type PatientProfileSection,
} from "../../lib/patient-intake-display";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { Card } from "../Card";

type PatientIntakeRecordProps = {
  sections: PatientProfileSection[];
  submittedAt: string | null;
  loading?: boolean;
  error?: string | null;
  onboardingCompleted?: boolean;
};

export function PatientIntakePrivacyBanner() {
  return (
    <Card variant="outline" style={styles.privacyCard}>
      <View style={styles.privacyHeader}>
        <View style={styles.privacyIcon}>
          <Ionicons color={colors.primary} name="lock-closed" size={18} />
        </View>
        <Text style={[styles.privacyTitle, typography.bodyStrong]}>
          Your protected health information
        </Text>
      </View>
      <Text style={[styles.privacyCopy, typography.caption]}>
        What you see here comes from the onboarding you completed. It is encrypted in transit,
        stored under HIPAA with your burn center, and only shown while you are signed in on this
        device.
      </Text>
      <Text style={[styles.privacyCopy, typography.caption]}>
        Update your name or hospital in Settings. For changes to clinical answers, contact your
        care team — intake responses are read-only in the app.
      </Text>
    </Card>
  );
}

export function PatientIntakeRecord({
  sections,
  submittedAt,
  loading = false,
  error = null,
  onboardingCompleted = false,
}: PatientIntakeRecordProps) {
  const submittedLabel = formatPatientIntakeSubmittedAt(submittedAt);

  if (loading) {
    return (
      <Card variant="muted" style={styles.stateCard}>
        <Text style={[styles.stateTitle, typography.bodyStrong]}>Loading your record…</Text>
        <Text style={[styles.stateCopy, typography.caption]}>
          Fetching the onboarding answers saved to your account.
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outline" style={styles.stateCard}>
        <View style={styles.stateHeader}>
          <Ionicons color={colors.warning} name="cloud-offline-outline" size={22} />
          <Text style={[styles.stateTitle, typography.bodyStrong]}>Could not load intake</Text>
        </View>
        <Text style={[styles.stateCopy, typography.caption]}>
          {error} Pull down to refresh. Your care team still has what you submitted during
          onboarding.
        </Text>
      </Card>
    );
  }

  if (sections.length === 0) {
    return (
      <Card variant="muted" style={styles.stateCard}>
        <Text style={[styles.stateTitle, typography.bodyStrong]}>
          {onboardingCompleted ? "Intake record not found" : "Finish onboarding"}
        </Text>
        <Text style={[styles.stateCopy, typography.caption]}>
          {onboardingCompleted
            ? "We could not find your burn intake on the server yet. Pull down to refresh or contact your care team if this persists."
            : "Complete onboarding so your profile and burn questionnaires appear here for your reference."}
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.sections}>
      {submittedLabel ? (
        <View style={styles.submittedRow}>
          <Ionicons color={colors.textMuted} name="time-outline" size={16} />
          <Text style={[styles.submittedText, typography.caption]}>
            Onboarding submitted {submittedLabel}
          </Text>
        </View>
      ) : null}

      {sections.map((section) => (
        <Card key={section.id} variant="outline" style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, typography.title]}>{section.title}</Text>
          {section.description ? (
            <Text style={[styles.sectionDescription, typography.caption]}>
              {section.description}
            </Text>
          ) : null}
          <View style={styles.rows}>
            {section.rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={[styles.rowLabel, typography.micro]}>{row.label}</Text>
                <Text
                  selectable
                  style={[styles.rowValue, typography.body]}
                  accessibilityLabel={`${row.label}: ${row.value}`}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  privacyCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitle: {
    flex: 1,
    color: colors.text,
  },
  privacyCopy: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sections: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  submittedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  submittedText: {
    color: colors.textMuted,
  },
  sectionCard: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
  },
  sectionDescription: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rows: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  rowValue: {
    color: colors.text,
    lineHeight: 22,
  },
  stateCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  stateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stateTitle: {
    color: colors.text,
  },
  stateCopy: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

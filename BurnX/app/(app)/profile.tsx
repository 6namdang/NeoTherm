import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { PageHeader } from "../../src/components/PageHeader";
import {
  PatientIntakePrivacyBanner,
  PatientIntakeRecord,
} from "../../src/components/profile/PatientIntakeRecord";
import { Screen } from "../../src/components/Screen";
import { TrustFooter } from "../../src/components/TrustFooter";
import { hospitals } from "../../src/constants/hospitals";
import {
  buildPatientProfileSections,
  loadPatientIntakeRecord,
  type PatientIntakeRecord as IntakeRecord,
} from "../../src/lib/patient-intake-display";
import { usePostAuth } from "../../src/lib/post-auth-context";
import { useSession } from "../../src/lib/auth-context";
import { decodeJwtPayload } from "../../src/lib/jwt";
import { getStorageItem } from "../../src/lib/storage";
import { fontFamily } from "../../src/theme/fontFamily";
import { colors } from "../../src/theme/colors";
import { radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

function initialsFromName(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return t.slice(0, Math.min(2, t.length)).toUpperCase();
}

function hospitalNameForId(id: string | undefined): string | null {
  if (!id || typeof id !== "string" || id.trim() === "") return null;
  return hospitals.find((h) => h.id === id.trim())?.name ?? null;
}

export default function ProfileScreen() {
  const { role, signOut } = useSession();
  const { me, ready } = usePostAuth();
  const [jwtEmail, setJwtEmail] = useState<string | null>(null);
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isDoctor = role === "doctor";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getStorageItem("idToken");
      const payload = decodeJwtPayload(token ?? "");
      if (cancelled || !payload) return;
      const e = payload.email;
      const email =
        typeof e === "string" && e.trim() !== "" ? e.trim() : null;
      setJwtEmail(email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadIntake = useCallback(async () => {
    if (isDoctor) {
      setIntake(null);
      setIntakeError(null);
      return;
    }
    setIntakeLoading(true);
    setIntakeError(null);
    try {
      setIntake(await loadPatientIntakeRecord());
    } catch {
      setIntakeError("We couldn't reach NeoTherm securely right now.");
    } finally {
      setIntakeLoading(false);
    }
  }, [isDoctor]);

  useFocusEffect(
    useCallback(() => {
      void loadIntake();
    }, [loadIntake]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadIntake();
    } finally {
      setRefreshing(false);
    }
  }, [loadIntake]);

  const displayName = useMemo(() => {
    const trimmed = typeof me?.name === "string" ? me.name.trim() : "";
    if (trimmed !== "") return trimmed;
    return isDoctor ? "Clinician" : "Patient";
  }, [me?.name, isDoctor]);

  const hospitalLabel = useMemo(() => {
    const id =
      typeof me?.hospital_id === "string" ? me.hospital_id.trim() : "";
    if (id === "") return "Hospital not linked in your profile";
    const name = hospitalNameForId(id);
    return name ?? `Organization on file (${id})`;
  }, [me?.hospital_id]);

  const profileSections = useMemo(() => {
    if (isDoctor) return [];
    return buildPatientProfileSections({
      name: me?.name,
      hospitalId: me?.hospital_id,
      intakeAnswers: intake?.answers ?? {},
    });
  }, [intake?.answers, isDoctor, me?.hospital_id, me?.name]);

  const avatarLetters = initialsFromName(me?.name ?? displayName);

  const profileChip = isDoctor ? "Clinician signed in" : "Patient signed in";

  const onboardingNote =
    me?.onboarding_completed === true
      ? isDoctor
        ? "Clinical tools use your verified hospital role."
        : "Your onboarding answers are stored with your burn center and shown below."
      : "Finish onboarding so your profile and clinical intake appear here.";

  return (
    <Screen
      animateEntry
      preset="tabs"
      scroll
      refreshControl={
        !isDoctor ? (
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      <StatusBar style="dark" />

      <PageHeader
        eyebrow="Your account"
        subtitle={
          isDoctor
            ? "NeoTherm checks login with your organization's security policies on each refresh."
            : "Review the onboarding information you shared — encrypted and visible only while signed in."
        }
        title="Profile & settings"
      />

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetters}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={[styles.displayName, typography.title]}>
                {displayName}
              </Text>
              <Text style={[styles.chipMuted, typography.micro]}>
                {profileChip}
              </Text>
              <Text style={[styles.meta, typography.caption]}>
                {onboardingNote}
              </Text>
              {jwtEmail ? (
                <Text
                  selectable
                  style={[styles.emailLine, typography.caption]}
                  accessibilityLabel={`Sign-in email ${jwtEmail}`}
                >
                  {jwtEmail}
                </Text>
              ) : null}
            </View>
          </View>

          {!isDoctor ? (
            <>
              <PatientIntakePrivacyBanner />

              <Card variant="outline" style={styles.infoCard}>
                <InfoRow
                  icon="business-outline"
                  label="Burn center"
                  value={hospitalLabel}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="mail-outline"
                  label="Sign-in email"
                  value={jwtEmail ?? "Not available on this device"}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="shield-checkmark-outline"
                  label="Access"
                  value="HIPAA-protected patient app"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/settings" as Href)}
                  style={({ pressed }) => [
                    styles.settingsLink,
                    pressed && styles.settingsLinkPressed,
                  ]}
                >
                  <Ionicons color={colors.primary} name="settings-outline" size={18} />
                  <Text style={[styles.settingsLinkText, typography.bodyStrong]}>
                    Edit name or hospital in Settings
                  </Text>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              </Card>

              <Text style={[styles.sectionHeading, typography.micro]}>
                Onboarding record
              </Text>

              <PatientIntakeRecord
                error={intakeError}
                loading={intakeLoading && !refreshing}
                onboardingCompleted={me?.onboarding_completed === true}
                sections={profileSections}
                submittedAt={intake?.submittedAt ?? null}
              />
            </>
          ) : (
            <Card variant="outline" style={styles.infoCard}>
              <InfoRow
                icon="business-outline"
                label="Hospital"
                value={hospitalLabel}
              />
              <View style={styles.divider} />
              <InfoRow
                icon="lock-closed-outline"
                label="Access"
                value="Clinical app (HIPAA)"
              />
              <View style={styles.divider} />
              <InfoRow
                icon="cloud-done-outline"
                label="Sync"
                value="Backed up according to hospital policy"
              />
            </Card>
          )}

          <Card variant="muted" style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <Ionicons name="shield-half-outline" size={22} color={colors.primary} />
              <Text style={[styles.sessionCopy, typography.caption]}>
                Sign out clears this device until you enter your password again. Do not share
                screenshots of your health information.
              </Text>
            </View>
            <Button title="Sign out" variant="destructiveOutline" onPress={signOut} />
          </Card>

          <TrustFooter
            dense
            message={
              isDoctor
                ? "Downloading or emailing patient charts from NeoTherm follows your hospital's rules. Ask your privacy officer when unsure."
                : "Your onboarding answers are shared only with your selected burn center under HIPAA. Contact your care team to correct clinical details."
            }
          />
        </>
      )}
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color={colors.textMuted} name={icon} size={20} />
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, typography.micro]}>{label}</Text>
        <Text style={[styles.infoValue, typography.bodyStrong]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: 22,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.8,
    maxWidth: 56,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  chipMuted: {
    color: colors.textMuted,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 2,
  },
  displayName: {
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  emailLine: {
    color: colors.textSecondary,
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    gap: 0,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 28,
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  settingsLinkPressed: {
    opacity: 0.88,
  },
  settingsLinkText: {
    flex: 1,
    color: colors.primary,
    fontSize: 15,
  },
  sectionHeading: {
    color: colors.textMuted,
    letterSpacing: 0.55,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sessionCard: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sessionCopy: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
  },
});

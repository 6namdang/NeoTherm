import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { TrustFooter } from "../../src/components/TrustFooter";
import { hospitals } from "../../src/constants/hospitals";
import { usePostAuth } from "../../src/lib/post-auth-context";
import { useSession } from "../../src/lib/auth-context";
import { decodeJwtPayload } from "../../src/lib/jwt";
import { getStorageItem } from "../../src/lib/storage";
import { colors } from "../../src/theme/colors";
import { fontFamily } from "../../src/theme/fontFamily";
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

export default function DoctorProfileScreen() {
  const { signOut } = useSession();
  const { me, ready } = usePostAuth();
  const [jwtEmail, setJwtEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getStorageItem("idToken");
      const payload = decodeJwtPayload(token ?? "");
      if (cancelled || !payload) return;
      const e = payload.email;
      const email = typeof e === "string" && e.trim() !== "" ? e.trim() : null;
      setJwtEmail(email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => {
    const trimmed = typeof me?.name === "string" ? me.name.trim() : "";
    return trimmed !== "" ? trimmed : "Clinician";
  }, [me?.name]);

  const hospitalLabel = useMemo(() => {
    const id = typeof me?.hospital_id === "string" ? me.hospital_id.trim() : "";
    if (id === "") return "Hospital not linked in your profile";
    const name = hospitalNameForId(id);
    return name ?? `Organization on file (${id})`;
  }, [me?.hospital_id]);

  const avatarLetters = initialsFromName(me?.name ?? displayName);

  const clinicalTitle =
    typeof me?.title === "string" && me.title.trim() !== ""
      ? me.title.trim()
      : null;
  const specialty =
    typeof me?.specialty === "string" && me.specialty.trim() !== ""
      ? me.specialty.trim()
      : null;
  const department =
    typeof me?.department === "string" && me.department.trim() !== ""
      ? me.department.trim()
      : null;

  const onboardingNote =
    me?.onboarding_completed === true
      ? "Clinical tools use your verified hospital identity."
      : "Finish clinician onboarding when prompted so affiliation data stays aligned.";

  return (
    <Screen animateEntry preset="tabs" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Your account"
        subtitle="Affiliation and sign-in attributes as stored by your NeoTherm administrator."
        title="Personal"
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
              <Text style={[styles.displayName, typography.title]}>{displayName}</Text>
              <Text style={[styles.chipMuted, typography.micro]}>Clinician signed in</Text>
              <Text style={[styles.meta, typography.caption]}>{onboardingNote}</Text>
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

          <Card variant="outline" style={styles.infoCard}>
            <InfoRow icon="business-outline" label="Hospital affiliation" value={hospitalLabel} />
            <View style={styles.divider} />
            <InfoRow
              icon="medkit-outline"
              label="Clinical title"
              value={clinicalTitle ?? "Not returned by server profile"}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="fitness-outline"
              label="Specialty"
              value={specialty ?? "Not returned by server profile"}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="people-outline"
              label="Department"
              value={department ?? "Optional — not set"}
            />
          </Card>

          <Card variant="muted" style={styles.sessionCard}>
            <View style={styles.sessionRow}>
              <Ionicons name="shield-half-outline" size={22} color={colors.primary} />
              <Text style={[styles.sessionCopy, typography.caption]}>
                Sign out clears this device until you enter your credentials again.
              </Text>
            </View>
            <Button title="Sign out" variant="destructiveOutline" onPress={signOut} />
          </Card>

          <TrustFooter
            dense
            message="Access to patient lists follows your hospital's policies. Use NeoTherm only on approved devices."
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


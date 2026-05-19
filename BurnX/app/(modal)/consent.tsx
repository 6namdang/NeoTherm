import { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import {
  CONSENT_CONTENT,
  type ConsentCheckboxCopy,
} from "../../src/constants/forms/consent";
import { useSession } from "../../src/lib/auth-context";
import { useConsentGate } from "../../src/lib/consent-gate-context";
import { recordConsent } from "../../src/lib/consent";
import { useToast } from "../../src/components/ToastProvider";
import { colors } from "../../src/theme/colors";
import { radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

const CONTENT_MAX_W = 400;

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const { role, signOut } = useSession();
  const { showToast } = useToast();
  const { markConsentRecorded } = useConsentGate();

  const consentCheckboxes = CONSENT_CONTENT.consentCheckboxes;

  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(consentCheckboxes.map((c) => [c.id, false])),
  );

  const requiredOk = useMemo(
    () => consentCheckboxes.filter((c) => c.required).every((c) => checks[c.id]),
    [consentCheckboxes, checks],
  );

  const [submitting, setSubmitting] = useState(false);

  function toggleCheck(id: string): void {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const onAccept = useCallback(async () => {
    if (!requiredOk || submitting) return;
    setSubmitting(true);
    try {
      await recordConsent(checks);
      markConsentRecorded();
      const dest =
        role === "doctor" ? ("/(app-doctor)" as Href) : ("/(app)" as Href);
      router.replace(dest);
    } catch {
      showToast(
        "We could not save your consent. Check your connection and try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    checks,
    markConsentRecorded,
    requiredOk,
    role,
    showToast,
    submitting,
  ]);

  const onDecline = useCallback(async () => {
    showToast(
      "You need to accept the study agreement to continue using the recovery program.",
      "info",
    );
    await signOut();
    router.replace("/" as Href);
  }, [showToast, signOut]);

  const footerPad = Math.max(insets.bottom, spacing.md);
  const learnMore = CONSENT_CONTENT.optionalLearnMore;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        accessibilityRole="scrollbar"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: footerPad },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.heroWrap}>
            <View style={styles.heroCircle}>
              <Ionicons color="#D9415E" name="heart" size={42} />
              <View style={styles.lockBadge} accessibilityElementsHidden>
                <Ionicons color={colors.textOnPrimary} name="lock-closed" size={13} />
              </View>
            </View>
          </View>

          <Text
            accessibilityRole="header"
            style={[styles.headline, typography.headlineLarge]}
          >
            {CONSENT_CONTENT.headline}
          </Text>
          <Text style={[styles.partnerLine, typography.caption]}>
            {CONSENT_CONTENT.partnerLine}
          </Text>

          {CONSENT_CONTENT.paragraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, typography.body]}>
              {p}
            </Text>
          ))}

          <View style={styles.controlSection}>
            <Text style={[styles.controlTitle, typography.bodyStrong]}>
              {CONSENT_CONTENT.controlSection.title}
            </Text>
            {CONSENT_CONTENT.controlSection.bullets.map((b) => (
              <View key={b.text} style={styles.controlBullet}>
                <Ionicons
                  color={colors.primary}
                  name={b.icon}
                  size={22}
                  style={styles.controlBulletIcon}
                />
                <Text style={[styles.controlBulletText, typography.body]}>
                  {b.text}
                </Text>
              </View>
            ))}
          </View>

          {learnMore?.url?.length ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={learnMore.label}
              hitSlop={8}
              onPress={() =>
                Linking.canOpenURL(learnMore.url).then((can) =>
                  can ? Linking.openURL(learnMore.url) : undefined,
                )
              }
            >
              <Text style={[styles.learnMore, typography.bodyStrong]}>
                {learnMore.label}
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.agreementsIntro, typography.body]}>
            {CONSENT_CONTENT.agreementsIntro}
          </Text>

          <View style={styles.checkList}>
            {consentCheckboxes.map((checkbox: ConsentCheckboxCopy) => (
              <Pressable
                key={checkbox.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checks[checkbox.id] }}
                accessibilityLabel={checkbox.label}
                style={({ pressed }) => [
                  styles.checkRow,
                  checks[checkbox.id] && styles.checkRowOn,
                  pressed && styles.checkRowPressed,
                ]}
                onPress={() => toggleCheck(checkbox.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    checks[checkbox.id] && styles.checkboxOn,
                  ]}
                  accessibilityElementsHidden
                >
                  {checks[checkbox.id] ? (
                    <Ionicons
                      color={colors.textOnPrimary}
                      name="checkmark"
                      size={16}
                    />
                  ) : null}
                </View>
                <Text style={[styles.checkLabel, typography.body]}>
                  {checkbox.label}
                  {!checkbox.required ? (
                    <Text style={styles.optionalTag}> Optional</Text>
                  ) : null}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <View style={styles.footerCtaWrap}>
          <Button
            disabled={!requiredOk || submitting}
            style={styles.footerPrimary}
            title={submitting ? "Saving…" : "Continue"}
            onPress={() => void onAccept()}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decline and sign out"
          disabled={submitting}
          hitSlop={12}
          onPress={() => void onDecline()}
          style={({ pressed }) => [styles.secondaryAction, pressed && { opacity: 0.72 }]}
        >
          <Text style={[styles.declineLink, typography.bodyStrong]}>
            I do not agree
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  column: {
    width: "100%",
    maxWidth: CONTENT_MAX_W,
    alignItems: "center",
  },
  heroWrap: {
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  heroCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#FEECEF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  lockBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headline: {
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
    width: "100%",
    letterSpacing: -0.2,
  },
  partnerLine: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
    width: "100%",
  },
  paragraph: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    width: "100%",
    lineHeight: (typography.body.fontSize ?? 16) + 6,
  },
  controlSection: {
    alignSelf: "stretch",
    width: "100%",
    marginBottom: spacing.lg,
  },
  controlTitle: {
    color: colors.text,
    textAlign: "left",
    marginBottom: spacing.sm,
    width: "100%",
  },
  controlBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.sm,
    width: "100%",
  },
  controlBulletIcon: {
    marginTop: 2,
  },
  controlBulletText: {
    flex: 1,
    color: colors.textSecondary,
    textAlign: "left",
    lineHeight: (typography.body.fontSize ?? 16) + 6,
  },
  learnMore: {
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  agreementsIntro: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    width: "100%",
  },
  checkList: {
    width: "100%",
    alignSelf: "stretch",
    marginBottom: spacing.xl,
  },
  checkRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  checkRowPressed: {
    opacity: 0.92,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    width: "100%",
    color: colors.text,
    flexWrap: "wrap",
    textAlign: "center",
  },
  optionalTag: {
    color: colors.textMuted,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.md,
    alignItems: "center",
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  footerCtaWrap: {
    width: "100%",
    maxWidth: CONTENT_MAX_W,
    alignSelf: "center",
  },
  footerPrimary: {
    width: "100%",
    alignSelf: "stretch",
  },
  secondaryAction: {
    paddingVertical: spacing.xs,
  },
  declineLink: {
    color: colors.primary,
    textAlign: "center",
  },
});

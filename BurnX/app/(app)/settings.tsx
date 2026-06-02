import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";

import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { HospitalPickerField } from "../../src/components/HospitalPickerField";
import { Input } from "../../src/components/Input";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/ToastProvider";
import { createMe } from "../../src/lib/api";
import { deletePatientAccount } from "../../src/lib/patient-account-deletion";
import { usePostAuth } from "../../src/lib/post-auth-context";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

export default function PatientSettingsScreen() {
  const { me, refetch } = usePostAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(typeof me?.name === "string" ? me.name : "");
    setHospitalId(typeof me?.hospital_id === "string" ? me.hospital_id : "");
  }, [me?.hospital_id, me?.name]);

  async function save() {
    const trimmedName = name.trim();
    if (trimmedName === "" || hospitalId.trim() === "") {
      Alert.alert("Settings", "Enter your name and select your hospital.");
      return;
    }

    setSaving(true);
    try {
      await createMe({ name: trimmedName, hospital_id: hospitalId.trim() });
      await refetch();
      Alert.alert("Settings", "Your personal information was updated.");
    } catch (caught) {
      Alert.alert(
        "Settings",
        caught instanceof Error ? caught.message : "Could not update your information.",
      );
    } finally {
      setSaving(false);
    }
  }

  function promptDeleteAccount() {
    showToast(
      "Deleting your account permanently removes your profile, care program responses, voice recordings, and data on this device. This cannot be undone.",
      "info",
    );
    Alert.alert(
      "Delete account?",
      "Your NeoTherm profile and all associated health information will be permanently deleted from our systems and this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => void confirmDeleteAccount(),
        },
      ],
    );
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    try {
      await deletePatientAccount();
      showToast("Your account and data were deleted.", "success");
      router.replace("/" as Href);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Could not delete your account.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <Screen animateEntry preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Update the personal information NeoTherm uses for your profile."
        onBackPress={() => router.back()}
      />

      <Card style={styles.form}>
        <Input
          label="Full name"
          value={name}
          placeholder="Your name"
          onChangeText={setName}
        />
        <HospitalPickerField
          required
          label="Hospital"
          value={hospitalId}
          onChange={setHospitalId}
          helpText="Choose the burn center connected to your care."
        />
      </Card>

      <Text style={[styles.note, typography.caption]}>
        Changes are saved to your NeoTherm profile and reflected after refresh.
      </Text>

      <View style={styles.actions}>
        <Button
          disabled={busy}
          title={saving ? "Saving..." : "Save changes"}
          onPress={() => void save()}
        />
        <Button
          disabled={busy}
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>

      <Card variant="muted" style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <Ionicons color={colors.danger} name="warning-outline" size={22} />
          <Text style={[styles.dangerTitle, typography.bodyStrong]}>Delete account</Text>
        </View>
        <Text style={[styles.dangerCopy, typography.caption]}>
          Permanently delete your NeoTherm account, all care program responses, voice check-ins,
          and local data on this device. Your burn center will no longer see your information in
          NeoTherm.
        </Text>
        <Button
          disabled={busy}
          title={deleting ? "Deleting..." : "Delete account"}
          variant="destructiveOutline"
          onPress={promptDeleteAccount}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  note: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dangerCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dangerTitle: {
    color: colors.danger,
  },
  dangerCopy: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

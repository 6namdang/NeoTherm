import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";

import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { HospitalPickerField } from "../../src/components/HospitalPickerField";
import { Input } from "../../src/components/Input";
import { PageHeader } from "../../src/components/PageHeader";
import { Screen } from "../../src/components/Screen";
import { createMe } from "../../src/lib/api";
import { usePostAuth } from "../../src/lib/post-auth-context";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

export default function DoctorSettingsScreen() {
  const { me, refetch } = usePostAuth();
  const [name, setName] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(typeof me?.name === "string" ? me.name : "");
    setHospitalId(typeof me?.hospital_id === "string" ? me.hospital_id : "");
    setTitle(typeof me?.title === "string" ? me.title : "");
    setSpecialty(typeof me?.specialty === "string" ? me.specialty : "");
    setDepartment(typeof me?.department === "string" ? me.department : "");
  }, [me?.department, me?.hospital_id, me?.name, me?.specialty, me?.title]);

  async function save() {
    const trimmedName = name.trim();
    const trimmedHospital = hospitalId.trim();
    const trimmedTitle = title.trim();
    const trimmedSpecialty = specialty.trim();
    const trimmedDepartment = department.trim();

    if (
      trimmedName === "" ||
      trimmedHospital === "" ||
      trimmedTitle === "" ||
      trimmedSpecialty === ""
    ) {
      Alert.alert("Settings", "Enter your name, hospital, title, and specialty.");
      return;
    }

    setSaving(true);
    try {
      await createMe({
        name: trimmedName,
        hospital_id: trimmedHospital,
        title: trimmedTitle,
        specialty: trimmedSpecialty,
        department: trimmedDepartment || undefined,
      });
      await refetch();
      Alert.alert("Settings", "Your professional information was updated.");
    } catch (caught) {
      Alert.alert(
        "Settings",
        caught instanceof Error ? caught.message : "Could not update your information.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen animateEntry preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Update the professional information NeoTherm shows in your account."
        onBackPress={() => router.back()}
      />

      <Card style={styles.form}>
        <Input label="Full name" value={name} placeholder="Your name" onChangeText={setName} />
        <HospitalPickerField
          required
          label="Hospital"
          value={hospitalId}
          onChange={setHospitalId}
          helpText="Choose your main hospital affiliation."
        />
        <Input label="Title" value={title} placeholder="MD, RN, PA, NP" onChangeText={setTitle} />
        <Input label="Specialty" value={specialty} placeholder="Burn surgery, pain, rehab" onChangeText={setSpecialty} />
        <Input label="Department" value={department} placeholder="Optional" onChangeText={setDepartment} />
      </Card>

      <Text style={[styles.note, typography.caption]}>
        Changes are saved to your NeoTherm profile and reflected after refresh.
      </Text>

      <View style={styles.actions}>
        <Button
          disabled={saving}
          title={saving ? "Saving..." : "Save changes"}
          onPress={() => void save()}
        />
        <Button
          disabled={saving}
          title="Cancel"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
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
  },
});

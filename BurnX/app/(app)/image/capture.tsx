import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { Button } from "../../../src/components/Button";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { useToast } from "../../../src/components/ToastProvider";
import { WOUND_BODY_LOCATIONS, type WoundBodyLocationValue } from "../../../src/constants/wound-body-locations";
import { formatPhotoTakenLong } from "../../../src/lib/format-photo-date";
import {
  pickFromCamera,
  pickFromLibrary,
  uploadWoundImage,
  type WoundPickResult,
} from "../../../src/lib/wound-image-upload";
import { colors } from "../../../src/theme/colors";
import { fontFamily } from "../../../src/theme/fontFamily";
import { radius, spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

export default function WoundCaptureScreen() {
  const { showToast } = useToast();
  const [picked, setPicked] = useState<WoundPickResult | null>(null);
  const [bodyLocation, setBodyLocation] = useState<WoundBodyLocationValue | "">("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (Platform.OS === "web") {
    return (
      <Screen preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader title="Add photo" onBackPress={() => router.back()} />
        <Text style={[typography.body, styles.webMsg]}>
          Adding wound photos is available in the BurnX mobile app.
        </Text>
        <Button title="Go back" onPress={() => router.back()} variant="secondary" />
      </Screen>
    );
  }

  async function onTakePhoto() {
    const next = await pickFromCamera();
    if (next !== null) setPicked(next);
  }

  async function onChooseLibrary() {
    const next = await pickFromLibrary();
    if (next !== null) setPicked(next);
  }

  async function onSubmit() {
    if (picked === null) {
      showToast("Choose or take a photo first.", "info");
      return;
    }
    setUploading(true);
    try {
      await uploadWoundImage(
        picked.uri,
        bodyLocation === "" ? null : bodyLocation,
        notes.trim() === "" ? null : notes.trim(),
        { recorded_at: picked.takenAtIso },
      );
      showToast("Photo uploaded, analyzing…", "success");
      router.replace("/image" as Href);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setUploading(false);
    }
  }

  const locationLabel =
    bodyLocation === ""
      ? "Body area (optional)"
      : WOUND_BODY_LOCATIONS.find((o) => o.value === bodyLocation)?.label ?? bodyLocation;

  return (
    <Screen preset="stack" scroll keyboardAvoid>
      <StatusBar style="dark" />
      <PageHeader title="Add photo" onBackPress={() => router.back()} />
      {!picked ? (
        <Text style={[typography.body, styles.lead]}>Choose how you would like to add a wound photo.</Text>
      ) : null}

      {!picked ? (
        <View style={styles.pickGrid}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo with camera"
            onPress={() => void onTakePhoto()}
            style={({ pressed }) => [styles.pickCard, pressed && styles.pickCardPressed]}
          >
            <View style={[styles.pickIconCircle, styles.pickIconPrimary]}>
              <Ionicons color={colors.primary} name="camera" size={28} />
            </View>
            <Text style={[typography.bodyStrong, styles.pickCardTitle]}>Take photo</Text>
            <Text style={[typography.caption, styles.pickCardSub]}>Use your camera — best lighting, no glare</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose from photo library"
            onPress={() => void onChooseLibrary()}
            style={({ pressed }) => [styles.pickCard, styles.pickCardSecondary, pressed && styles.pickCardPressed]}
          >
            <View style={styles.pickIconCircle}>
              <Ionicons color={colors.primary} name="images-outline" size={28} />
            </View>
            <Text style={[typography.bodyStrong, styles.pickCardTitle]}>Choose from library</Text>
            <Text style={[typography.caption, styles.pickCardSub]}>Select an existing photo from your gallery</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.previewChrome}>
            <Image contentFit="contain" source={{ uri: picked.uri }} style={styles.preview} transition={200} />
            <View style={styles.dateRibbon}>
              <Ionicons color={colors.primary} name="calendar-outline" size={16} />
              <View style={styles.dateRibbonText}>
                <Text style={styles.dateRibbonEyebrow}>Photo taken</Text>
                <Text style={[typography.bodyStrong, styles.dateRibbonValue]}>
                  {formatPhotoTakenLong(picked.takenAtIso)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.hint, typography.caption]}>
            Review the image. Aim for steady hands, reduced glare, and the whole wound in frame if you can.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.selectRow, pressed && styles.selectRowPressed]}
          >
            <View style={styles.selectRowLead}>
              <Ionicons color={colors.primary} name="body-outline" size={20} />
              <Text style={[typography.body, styles.selectLabel]}>{locationLabel}</Text>
            </View>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={[styles.fieldLabel]}>Notes (optional)</Text>
          <TextInput
            accessibilityLabel="Optional notes"
            multiline
            onChangeText={setNotes}
            placeholder="Anything you want your team to see with this photo…"
            placeholderTextColor={colors.textMuted}
            style={[styles.notes, typography.body]}
            value={notes}
          />

          <View style={styles.submitRow}>
            <Button disabled={uploading} title={uploading ? "Uploading…" : "Upload photo"} onPress={() => void onSubmit()} />
          </View>
          <Button disabled={uploading} title="Choose different photo" onPress={() => setPicked(null)} variant="secondary" />
        </>
      )}

      <Modal animationType="fade" transparent visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={[typography.title, styles.modalTitle]}>Body area</Text>
            <Text style={[typography.caption, styles.modalSub]}>Helps clinicians compare photos consistently.</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <Pressable
                style={styles.modalItem}
                onPress={() => {
                  setBodyLocation("");
                  setPickerOpen(false);
                }}
              >
                <Text style={typography.body}>None selected</Text>
              </Pressable>
              {WOUND_BODY_LOCATIONS.map((o) => (
                <Pressable
                  key={o.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setBodyLocation(o.value);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={typography.body}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {uploading ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  webMsg: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  lead: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  pickGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pickCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  pickCardSecondary: {
    backgroundColor: colors.surfaceSubtle,
  },
  pickCardPressed: {
    opacity: 0.92,
  },
  pickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pickIconPrimary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickCardTitle: {
    color: colors.text,
    marginBottom: 4,
  },
  pickCardSub: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  previewChrome: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
  },
  dateRibbon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dateRibbonText: {
    flex: 1,
    minWidth: 0,
  },
  dateRibbonEyebrow: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: 4,
  },
  dateRibbonValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  selectRowPressed: {
    backgroundColor: colors.surfaceSubtle,
  },
  selectRowLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  selectLabel: {
    color: colors.text,
    flex: 1,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontFamily: fontFamily.medium,
  },
  notes: {
    minHeight: 104,
    textAlignVertical: "top",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    color: colors.text,
    marginBottom: spacing.lg,
    fontFamily: fontFamily.regular,
    lineHeight: 22,
  },
  submitRow: {
    marginBottom: spacing.md,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250,250,250,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    maxHeight: "72%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  modalTitle: {
    marginBottom: spacing.xs,
    color: colors.text,
  },
  modalSub: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalList: {
    maxHeight: 360,
  },
  modalItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
});

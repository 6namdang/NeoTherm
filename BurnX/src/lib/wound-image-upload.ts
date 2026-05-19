import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { getWoundImageUploadUrl, submitWoundImage } from "./api";

/** Resolved after camera / library — includes best-effort capture time from EXIF or picker moment. */
export type WoundPickResult = {
  uri: string;
  takenAtIso: string;
};

/** Resize/compress to JPEG for S3 (backend expects `.jpg`). */
export async function normalizeToJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

function exifDigitsToIso(digits: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(digits.trim());
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isoFromAssetExif(exif: Record<string, unknown>): string | null {
  const tryKeys = ["DateTimeOriginal", "DateTimeDigitized", "DateTime"];
  for (const k of tryKeys) {
    const v = exif[k];
    if (typeof v === "string") {
      const iso = exifDigitsToIso(v);
      if (iso !== null) return iso;
    }
  }
  return null;
}

function takenAtIsoFromAsset(asset: ImagePicker.ImagePickerAsset, fallback: Date): string {
  const exif = asset.exif;
  if (exif !== null && exif !== undefined && typeof exif === "object" && !Array.isArray(exif)) {
    const fromExif = isoFromAssetExif(exif as Record<string, unknown>);
    if (fromExif !== null) return fromExif;
  }
  return fallback.toISOString();
}

async function finalizePick(asset: ImagePicker.ImagePickerAsset): Promise<WoundPickResult> {
  const fallback = new Date();
  const takenAtIso = takenAtIsoFromAsset(asset, fallback);
  const uri = await normalizeToJpeg(asset.uri);
  return { uri, takenAtIso };
}

export async function pickFromCamera(): Promise<WoundPickResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsEditing: false,
    exif: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return finalizePick(result.assets[0]);
}

export async function pickFromLibrary(): Promise<WoundPickResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsEditing: false,
    exif: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return finalizePick(result.assets[0]);
}

export async function uploadWoundImage(
  localJpegUri: string,
  bodyLocation: string | null,
  notes: string | null,
  options?: { recorded_at?: string },
): Promise<{ image_id: string }> {
  const { image_id, key, url } = await getWoundImageUploadUrl();
  const fileRes = await fetch(localJpegUri);
  if (!fileRes.ok) {
    throw new Error(`Could not read image file (${fileRes.status}).`);
  }
  const blob = await fileRes.blob();
  const putRes = await fetch(url, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  });
  if (!putRes.ok) {
    throw new Error(`Photo upload failed (${putRes.status}).`);
  }

  const ra = options?.recorded_at;
  await submitWoundImage({
    image_id,
    s3_key: key,
    ...(bodyLocation !== null && bodyLocation !== ""
      ? { body_location: bodyLocation }
      : {}),
    ...(notes !== null && notes.trim() !== "" ? { notes: notes.trim() } : {}),
    ...(typeof ra === "string" && ra.trim() !== "" ? { recorded_at: ra.trim() } : {}),
  });
  return { image_id };
}

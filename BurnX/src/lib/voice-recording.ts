import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import type { AudioRecorder } from "expo-audio/build/AudioModule.types";
import { createRecordingOptions } from "expo-audio/build/utils/options";

export type RecordingResult = { uri: string; durationMs: number };

type RecordingInstance = AudioRecorder;

async function normalizeAudioPlaybackMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });
  } catch {
    /* best-effort */
  }
}

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function prepareRecordingEnvironment(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: "duckOthers",
  });
}

// eslint-disable-next-line import/namespace -- AudioRecorder exists at runtime on AudioModule (typings omit nested ctor for ESLint)
const NativeAudioRecorder = AudioModule.AudioRecorder;

/** Prepare recorder; caller must `finishRecording()` or `cancelRecording()`. */
export async function beginRecording(): Promise<RecordingInstance> {
  await prepareRecordingEnvironment();
  const platformOpts = createRecordingOptions(RecordingPresets.HIGH_QUALITY);
  const recording = new NativeAudioRecorder(platformOpts);
  await recording.prepareToRecordAsync();
  recording.record();
  return recording;
}

/** Stops, restores playback mode; returns URI and duration when available. */
export async function finishRecording(
  recording: RecordingInstance,
  approxDurationMs?: number,
): Promise<RecordingResult> {
  try {
    await recording.stop();
    await normalizeAudioPlaybackMode();

    const status = recording.getStatus();
    const uri = status.url ?? recording.uri;
    if (!uri) {
      throw new Error("Recording failed — no audio file.");
    }

    let durationMs = approxDurationMs ?? 0;
    if (
      typeof status.durationMillis === "number" &&
      Number.isFinite(status.durationMillis) &&
      status.durationMillis > 0
    ) {
      durationMs = status.durationMillis;
    }

    return { uri, durationMs };
  } catch (err) {
    await normalizeAudioPlaybackMode();
    throw err;
  }
}

export async function cancelRecording(recording: RecordingInstance | null): Promise<void> {
  if (!recording) return;
  try {
    await recording.stop();
  } catch {
    /* already stopped */
  }
  await normalizeAudioPlaybackMode();
}

/** PUT recording file to presigned URL. */
export async function uploadToS3(uri: string, presignedUrl: string): Promise<void> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read recording file (${response.status}).`);
  }
  const blob = await response.blob();
  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": blob.type?.startsWith("audio/") ? blob.type : "audio/m4a",
    },
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload failed (${putRes.status}).`);
  }
}

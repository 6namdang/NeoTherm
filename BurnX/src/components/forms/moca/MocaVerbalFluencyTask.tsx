import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import {
  MOCA_VERBAL_FLUENCY_DURATION_MS,
  MOCA_VERBAL_FLUENCY_LETTER,
  type MocaVerbalFluencyCapture,
} from "../../../constants/forms/moca";
import {
  emptyVerbalFluencyCapture,
  scoreVerbalFluency,
} from "../../../lib/moca-verbal-fluency-scoring";
import {
  createMocaSpeechRecognition,
  getMocaSpeechUnavailableMessage,
  isMocaSpeechRecognitionAvailable,
} from "../../../lib/moca-speech-recognition";
import { runVerbalFluencyScript, stopMocaSpeech } from "../../../lib/moca-speech-synthesis";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaMemoryListenRow,
  MocaMemoryPanel,
  MocaMemoryRecordingRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskCaption,
  MocaTaskPrompt,
} from "./MocaSectionChrome";
import { MocaVoiceMicButton } from "./MocaVoiceMicButton";

type FluencyPhase = "ready" | "instructions" | "speak_ready" | "speaking" | "complete";

type MocaVerbalFluencyTaskProps = {
  capture: MocaVerbalFluencyCapture;
  onCaptureChange: (capture: MocaVerbalFluencyCapture) => void;
};

function formatCountdown(remainMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainMs / 1000));
  return `0:${totalSec.toString().padStart(2, "0")}`;
}

export function MocaVerbalFluencyTask({ capture, onCaptureChange }: MocaVerbalFluencyTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<FluencyPhase>("ready");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceCue, setVoiceCue] = useState("");
  const [recording, setRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainMs, setRemainMs] = useState(MOCA_VERBAL_FLUENCY_DURATION_MS);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);

  const transcriptRef = useRef("");
  const recordingActiveRef = useRef(false);
  const finishingRef = useRef(false);
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);

  const listening = voiceActive;

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  const finishSpeaking = useCallback(
    (durationMs: number) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      stopRecording();
      onCaptureChange(scoreVerbalFluency(transcriptRef.current, durationMs));
      setPhase("complete");
      setRemainMs(0);
    },
    [onCaptureChange, stopRecording],
  );

  const startSpeaking = useCallback(() => {
    setErrorMessage(null);
    transcriptRef.current = "";
    setRemainMs(MOCA_VERBAL_FLUENCY_DURATION_MS);
    const startedAt = Date.now();
    setStartedAtMs(startedAt);
    setPhase("speaking");
    onCaptureChange(emptyVerbalFluencyCapture());

    if (!speechAvailable) {
      setErrorMessage(getMocaSpeechUnavailableMessage());
      setPhase("speak_ready");
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        transcriptRef.current = [transcriptRef.current, text].filter(Boolean).join(" ").trim();
      },
      onInterimTranscript: () => {},
      onError: (message) => {
        setErrorMessage(message);
        recognitionRef.current = null;
        setRecording(false);
        recordingActiveRef.current = false;
      },
      onEnd: () => {
        if (recordingActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            recordingActiveRef.current = false;
            setRecording(false);
          }
          return;
        }
        recognitionRef.current = null;
        setRecording(false);
      },
    });

    if (!recognition) {
      setErrorMessage("Could not start speech recognition.");
      setPhase("speak_ready");
      return;
    }

    recognitionRef.current = recognition;
    recordingActiveRef.current = true;
    setRecording(true);
    recognition.start();
  }, [onCaptureChange, speechAvailable]);

  const playInstructions = useCallback(() => {
    setErrorMessage(null);
    setVoiceActive(true);
    setVoiceCue("Listen to the instructions.");
    runVerbalFluencyScript({
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceActive(false);
        setVoiceCue("");
        setPhase("speak_ready");
      },
      onError: (message) => {
        setVoiceActive(false);
        setVoiceCue("");
        setErrorMessage(message);
        setPhase("ready");
      },
    });
  }, []);

  const beginTask = useCallback(() => {
    onCaptureChange(emptyVerbalFluencyCapture());
    setPhase("instructions");
    playInstructions();
  }, [onCaptureChange, playInstructions]);

  const stopEarly = useCallback(() => {
    if (startedAtMs === null) return;
    finishSpeaking(Date.now() - startedAtMs);
  }, [finishSpeaking, startedAtMs]);

  useEffect(() => {
    if (phase !== "speaking" || startedAtMs === null) return;

    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAtMs;
      const nextRemain = Math.max(0, MOCA_VERBAL_FLUENCY_DURATION_MS - elapsed);
      setRemainMs(nextRemain);
      if (nextRemain <= 0) {
        finishSpeaking(MOCA_VERBAL_FLUENCY_DURATION_MS);
      }
    }, 250);

    return () => clearInterval(tick);
  }, [finishSpeaking, phase, startedAtMs]);

  useEffect(() => {
    return () => {
      stopMocaSpeech();
      recordingActiveRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const primaryAction = (() => {
    if (listening) {
      return {
        kind: "mic" as const,
        label: "Listening…",
        disabled: true,
        variant: "outline" as const,
        onPress: () => {},
      };
    }
    if (phase === "ready") {
      return {
        kind: "text" as const,
        label: "Begin",
        disabled: false,
        onPress: beginTask,
      };
    }
    if (phase === "speak_ready") {
      return {
        kind: "text" as const,
        label: "Start 1 minute",
        disabled: !speechAvailable,
        onPress: startSpeaking,
      };
    }
    if (phase === "speaking" && recording) {
      return {
        kind: "mic" as const,
        label: "Stop",
        disabled: false,
        variant: "stop" as const,
        onPress: stopEarly,
      };
    }
    return null;
  })();

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="VERBAL FLUENCY" />

      <MocaTaskPrompt>
        Say as many words starting with "{MOCA_VERBAL_FLUENCY_LETTER}" as you can.
      </MocaTaskPrompt>

      {phase === "ready" ? (
        <MocaTaskCaption>No proper nouns, numbers, or verb forms</MocaTaskCaption>
      ) : null}

      {listening ? <MocaMemoryListenRow cue={voiceCue || "Listen…"} /> : null}

      {phase === "speaking" ? (
        <View style={styles.timerContainer}>
          <Text style={styles.countdown}>{formatCountdown(remainMs)}</Text>
          <Text style={styles.timerLabel}>remaining</Text>
        </View>
      ) : null}

      {(recording || errorMessage) ? (
        <MocaMemoryPanel>
          {recording ? <MocaMemoryRecordingRow /> : null}
          {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
        </MocaMemoryPanel>
      ) : null}

      {primaryAction ? (
        <View style={styles.actionBar}>
          {primaryAction.kind === "text" ? (
            <MocaCompactButton
              disabled={primaryAction.disabled}
              title={primaryAction.label}
              onPress={primaryAction.onPress}
            />
          ) : (
            <MocaVoiceMicButton
              disabled={primaryAction.disabled}
              label={primaryAction.label}
              variant={primaryAction.variant}
              onPress={primaryAction.onPress}
            />
          )}
        </View>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  countdown: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 48,
    fontVariant: ["tabular-nums"],
    lineHeight: 56,
  },
  timerLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
});

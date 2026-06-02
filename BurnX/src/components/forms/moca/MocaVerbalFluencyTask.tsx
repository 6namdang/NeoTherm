import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import {
  MOCA_VERBAL_FLUENCY_DURATION_MS,
  MOCA_VERBAL_FLUENCY_LETTER,
  MOCA_VERBAL_FLUENCY_PASS_COUNT,
  type MocaVerbalFluencyCapture,
} from "../../../constants/forms/moca";
import {
  emptyVerbalFluencyCapture,
  scoreVerbalFluency,
} from "../../../lib/moca-verbal-fluency-scoring";
import {
  createMocaSpeechRecognition,
  isMocaSpeechRecognitionAvailable,
} from "../../../lib/moca-speech-recognition";
import { runVerbalFluencyScript, stopMocaSpeech } from "../../../lib/moca-speech-synthesis";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaInlineNote,
  MocaMemoryListenRow,
  MocaMemoryPanel,
  MocaMemoryRecordingRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskCaption,
  MocaTaskFooter,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
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
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainMs, setRemainMs] = useState(MOCA_VERBAL_FLUENCY_DURATION_MS);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);

  const transcriptRef = useRef("");
  const recordingActiveRef = useRef(false);
  const finishingRef = useRef(false);
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);

  const listening = voiceActive;
  const displayTranscript = useMemo(() => {
    const base = transcript.trim();
    const interim = interimTranscript.trim();
    if (!interim) return base;
    if (!base) return interim;
    return `${base} ${interim}`;
  }, [interimTranscript, transcript]);

  const stopRecording = useCallback(() => {
    recordingActiveRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
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
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
    setRemainMs(MOCA_VERBAL_FLUENCY_DURATION_MS);
    const startedAt = Date.now();
    setStartedAtMs(startedAt);
    setPhase("speaking");
    onCaptureChange(emptyVerbalFluencyCapture());

    if (!speechAvailable) {
      setErrorMessage(
        Platform.OS === "web"
          ? "Speech recognition is not available in this browser. Try Chrome or Edge."
          : "Live speech capture is web-first for now. Open MoCA in Chrome to test verbal fluency.",
      );
      setPhase("speak_ready");
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        transcriptRef.current = [transcriptRef.current, text].filter(Boolean).join(" ").trim();
        setTranscript(transcriptRef.current);
        setInterimTranscript("");
      },
      onInterimTranscript: setInterimTranscript,
      onError: (message) => {
        setErrorMessage(message);
        recognitionRef.current = null;
        setInterimTranscript("");
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
        setInterimTranscript("");
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

  const resetTask = useCallback(() => {
    stopMocaSpeech();
    stopRecording();
    finishingRef.current = false;
    setVoiceActive(false);
    setVoiceCue("");
    setErrorMessage(null);
    setTranscript("");
    transcriptRef.current = "";
    setStartedAtMs(null);
    setRemainMs(MOCA_VERBAL_FLUENCY_DURATION_MS);
    setPhase("ready");
    onCaptureChange(emptyVerbalFluencyCapture());
  }, [onCaptureChange, stopRecording]);

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

  const canStartOver = phase === "speak_ready" || phase === "complete";

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
        Tell me as many words as you can that begin with the letter {MOCA_VERBAL_FLUENCY_LETTER}.
        Proper nouns, numbers, and different forms of the same verb are not allowed.
      </MocaTaskPrompt>

      <MocaTaskCaption>Up to one minute</MocaTaskCaption>

      {listening ? <MocaMemoryListenRow cue={voiceCue || "Listen to the instructions."} /> : null}

      {phase === "speaking" ? (
        <Text style={[typography.caption, styles.countdown]}>{formatCountdown(remainMs)}</Text>
      ) : null}

      <MocaMemoryPanel>
        {recording ? <MocaMemoryRecordingRow /> : null}

        {displayTranscript ? (
          <MocaVoiceStatus body={displayTranscript} label="Live transcript" />
        ) : null}

        {phase === "complete" ? (
          <View style={styles.summaryStack}>
            <MocaVoiceStatus
              body={capture.validWords.map((entry) => entry.word).join(", ") || "—"}
              footer={`${capture.validCount} valid F-words`}
              label="Accepted words"
            />
            <MocaInlineNote>
              MoCA score: {capture.score} / 1 point ({MOCA_VERBAL_FLUENCY_PASS_COUNT}+ valid words
              required)
            </MocaInlineNote>
          </View>
        ) : null}

        {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
      </MocaMemoryPanel>

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

      {canStartOver ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={resetTask} />
        </MocaTaskFooter>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  countdown: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.xs,
    width: "100%",
  },
  summaryStack: {
    gap: spacing.md,
  },
});

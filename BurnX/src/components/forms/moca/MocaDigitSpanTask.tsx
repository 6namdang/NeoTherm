import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import type { MocaDigitSpanCapture } from "../../../constants/forms/moca";
import {
  applyDigitSpanBackward,
  scoreDigitSpanForward,
} from "../../../lib/moca-digit-span-scoring";
import {
  createMocaSpeechRecognition,
  isMocaSpeechRecognitionAvailable,
  normalizeSpokenDigits,
} from "../../../lib/moca-speech-recognition";
import {
  runBackwardDigitSpanScript,
  runForwardDigitSpanScript,
  stopMocaSpeech,
} from "../../../lib/moca-speech-synthesis";
import { spacing } from "../../../theme/spacing";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaInlineNote,
  MocaMemoryListenRow,
  MocaMemoryRecordingRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFooter,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
} from "./MocaSectionChrome";
import { MocaVoiceMicButton } from "./MocaVoiceMicButton";

type DigitSpanMode = "forward" | "backward";

type Phase = "ready" | "listening_read" | "speak_ready" | "recording" | "complete";

type MocaDigitSpanTaskProps = {
  mode: DigitSpanMode;
  capture: MocaDigitSpanCapture;
  onCaptureChange: (capture: MocaDigitSpanCapture) => void;
};

export function MocaDigitSpanTask({ mode, capture, onCaptureChange }: MocaDigitSpanTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<Phase>("ready");
  const [voiceCue, setVoiceCue] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [draftTranscript, setDraftTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureRef = useRef(capture);
  captureRef.current = capture;
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);

  const isForward = mode === "forward";
  const trialComplete = isForward
    ? capture.forward.completedAt !== null
    : capture.backwardSkipped || capture.backward?.completedAt != null;

  const displayTranscript = trialComplete
    ? isForward
      ? capture.forward.transcript
      : capture.backwardSkipped
        ? "(Skipped — forward order repeated)"
        : (capture.backward?.transcript ?? "")
    : [draftTranscript, interimTranscript].filter(Boolean).join(" ").trim();

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setPhase((prev) => (prev === "recording" ? "speak_ready" : prev));
  }, []);

  const startRecording = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");

    if (!speechAvailable) {
      setErrorMessage(
        Platform.OS === "web"
          ? "Speech recognition is not available in this browser. Try Chrome or Edge."
          : "Speech recognition requires a development build on iOS. Rebuild the app after installing expo-speech-recognition.",
      );
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        setDraftTranscript((prev) => [prev, text].filter(Boolean).join(" ").trim());
        setInterimTranscript("");
      },
      onInterimTranscript: setInterimTranscript,
      onError: (message) => {
        setErrorMessage(message);
        recognitionRef.current = null;
        setInterimTranscript("");
        setPhase("speak_ready");
      },
      onEnd: () => {
        recognitionRef.current = null;
        setInterimTranscript("");
        setPhase("speak_ready");
      },
    });

    if (!recognition) {
      setErrorMessage("Could not start speech recognition.");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("recording");
    recognition.start();
  }, [speechAvailable]);

  const beginReadAloud = useCallback(() => {
    stopMocaSpeech();
    setErrorMessage(null);
    setDraftTranscript("");
    setPhase("listening_read");
    setVoiceCue("");

    const handlers = {
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceCue("");
        setPhase("speak_ready");
      },
      onError: (message: string) => {
        setErrorMessage(message);
        setPhase("ready");
      },
    };

    if (isForward) runForwardDigitSpanScript(handlers);
    else runBackwardDigitSpanScript(handlers);
  }, [isForward]);

  const submitResponse = useCallback(() => {
    stopRecording();
    const transcript = [draftTranscript, interimTranscript].filter(Boolean).join(" ").trim();
    if (!transcript) return;

    if (isForward) {
      onCaptureChange({
        ...captureRef.current,
        forward: scoreDigitSpanForward(transcript),
        backward: null,
        backwardAdministered: false,
        backwardSkipped: false,
      });
    } else {
      onCaptureChange(applyDigitSpanBackward(captureRef.current, transcript));
    }
    setPhase("complete");
  }, [draftTranscript, interimTranscript, isForward, onCaptureChange, stopRecording]);

  const resetTask = useCallback(() => {
    stopMocaSpeech();
    stopRecording();
    setDraftTranscript("");
    setInterimTranscript("");
    setErrorMessage(null);
    setPhase("ready");
    if (isForward) {
      onCaptureChange({
        ...captureRef.current,
        forward: {
          ...captureRef.current.forward,
          transcript: "",
          normalized: "",
          correct: false,
          score: 0,
          completedAt: null,
        },
        backward: null,
        backwardAdministered: false,
        backwardSkipped: false,
      });
    } else {
      onCaptureChange({
        ...captureRef.current,
        backward: null,
        backwardAdministered: false,
        backwardSkipped: false,
      });
    }
  }, [isForward, onCaptureChange, stopRecording]);

  useEffect(() => {
    return () => {
      stopMocaSpeech();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const canSubmit =
    phase === "speak_ready" &&
    normalizeSpokenDigits([draftTranscript, interimTranscript].filter(Boolean).join(" ")).length >
      0;

  const scoreLine = isForward
    ? capture.forward.completedAt
      ? `MoCA score: ${capture.forward.score} / 1 point`
      : undefined
    : capture.backwardSkipped
      ? "Backward trial skipped (forward order repeated)."
      : capture.backward?.completedAt
        ? `MoCA score: ${capture.backward.score} / 1 point`
        : undefined;

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title={isForward ? "DIGIT SPAN (FORWARD)" : "DIGIT SPAN (BACKWARD)"} />

      <MocaTaskPrompt>
        {isForward
          ? "Listen to the numbers, then repeat them in the same order."
          : "Listen to the numbers, then repeat them in backward order."}
      </MocaTaskPrompt>

      {phase === "listening_read" && voiceCue ? <MocaMemoryListenRow cue={voiceCue} /> : null}
      {phase === "recording" ? <MocaMemoryRecordingRow /> : null}

      {phase === "ready" ? (
        <MocaCompactButton title="Begin" onPress={beginReadAloud} />
      ) : null}

      {phase === "speak_ready" || phase === "recording" ? (
        <View style={styles.controls}>
          {phase === "recording" ? (
            <MocaVoiceMicButton label="Stop" variant="stop" onPress={stopRecording} />
          ) : (
            <MocaVoiceMicButton
              disabled={!speechAvailable}
              label="Start speaking"
              onPress={startRecording}
            />
          )}
        </View>
      ) : null}

      {displayTranscript ? (
        <MocaVoiceStatus
          body={displayTranscript}
          footer={scoreLine}
          label={trialComplete ? "Your response" : "Live transcript"}
        />
      ) : null}

      {!trialComplete && (phase === "speak_ready" || phase === "recording") ? (
        <View style={styles.actionBar}>
          <MocaCompactButton disabled={!canSubmit} title="Submit answer" onPress={submitResponse} />
        </View>
      ) : null}

      {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}

      {!isForward && capture.forward.completedAt && !trialComplete ? (
        <MocaInlineNote>
          If you repeat the digits in forward order (7-4-2), the backward trial is not scored.
        </MocaInlineNote>
      ) : null}

      {trialComplete ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={resetTask} />
        </MocaTaskFooter>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  controls: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    width: "100%",
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
});

import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { MocaDigitSpanCapture } from "../../../constants/forms/moca";
import {
  applyDigitSpanBackward,
  scoreDigitSpanForward,
} from "../../../lib/moca-digit-span-scoring";
import {
  createMocaSpeechRecognition,
  getMocaSpeechUnavailableMessage,
  isMocaSpeechRecognitionAvailable,
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
  MocaMemoryListenRow,
  MocaMemoryRecordingRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskPrompt,
} from "./MocaSectionChrome";
import { MocaVoiceMicButton } from "./MocaVoiceMicButton";

type DigitSpanMode = "forward" | "backward";

type Phase = "ready" | "listening_read" | "speak_ready" | "recording";

type MocaDigitSpanTaskProps = {
  mode: DigitSpanMode;
  capture: MocaDigitSpanCapture;
  onCaptureChange: (capture: MocaDigitSpanCapture) => void;
};

function isTrialComplete(capture: MocaDigitSpanCapture, isForward: boolean): boolean {
  if (isForward) {
    return capture.forward.completedAt !== null;
  }
  return capture.backwardSkipped || capture.backward?.completedAt != null;
}

export function MocaDigitSpanTask({ mode, capture, onCaptureChange }: MocaDigitSpanTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<Phase>("ready");
  const [voiceCue, setVoiceCue] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureRef = useRef(capture);
  captureRef.current = capture;
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);
  const draftTranscriptRef = useRef("");
  const stopRequestedRef = useRef(false);

  const isForward = mode === "forward";
  const finished = isTrialComplete(capture, isForward);
  const speaking = phase === "recording";

  const finalizeCapture = useCallback(
    (transcript: string) => {
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
      setPhase("speak_ready");
    },
    [isForward, onCaptureChange],
  );

  const stopSpeaking = useCallback(() => {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const transcript = [draftTranscriptRef.current, interimTranscript.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    finalizeCapture(transcript);
    draftTranscriptRef.current = "";
    setInterimTranscript("");
  }, [finalizeCapture, interimTranscript]);

  const startSpeaking = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");
    draftTranscriptRef.current = "";

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

    if (!speechAvailable) {
      setErrorMessage(getMocaSpeechUnavailableMessage());
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        draftTranscriptRef.current = [draftTranscriptRef.current, text]
          .filter(Boolean)
          .join(" ")
          .trim();
        setInterimTranscript("");
      },
      onInterimTranscript: setInterimTranscript,
      onError: (message) => {
        setErrorMessage(message);
        recognitionRef.current = null;
        setInterimTranscript("");
        stopRequestedRef.current = false;
        setPhase("speak_ready");
      },
      onEnd: () => {
        recognitionRef.current = null;
        setInterimTranscript("");
        stopRequestedRef.current = false;
        if (!isTrialComplete(captureRef.current, isForward)) {
          setPhase("speak_ready");
        }
      },
    });

    if (!recognition) {
      setErrorMessage("Could not start speech recognition.");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("recording");
    recognition.start();
  }, [isForward, onCaptureChange, speechAvailable]);

  const beginReadAloud = useCallback(() => {
    stopMocaSpeech();
    setErrorMessage(null);
    setInterimTranscript("");
    draftTranscriptRef.current = "";
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

  useEffect(() => {
    if (finished) {
      setPhase("speak_ready");
    }
  }, [finished]);

  useEffect(() => {
    return () => {
      stopMocaSpeech();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title={isForward ? "DIGIT SPAN (FORWARD)" : "DIGIT SPAN (BACKWARD)"} />

      <MocaTaskPrompt>
        {isForward
          ? "Listen to the numbers, then repeat them in the same order."
          : "Listen to the numbers, then repeat them in backward order."}
      </MocaTaskPrompt>

      {phase === "listening_read" && voiceCue ? <MocaMemoryListenRow cue={voiceCue} /> : null}
      {speaking ? <MocaMemoryRecordingRow /> : null}

      {phase === "ready" && !finished ? (
        <MocaCompactButton title="Begin" onPress={beginReadAloud} />
      ) : null}

      {!finished && (phase === "speak_ready" || speaking) ? (
        <View style={styles.controls}>
          {speaking ? (
            <MocaVoiceMicButton label="Stop" variant="stop" onPress={stopSpeaking} />
          ) : (
            <MocaVoiceMicButton
              disabled={!speechAvailable}
              label="Start speaking"
              onPress={startSpeaking}
            />
          )}
        </View>
      ) : null}

      {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  controls: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    width: "100%",
  },
});

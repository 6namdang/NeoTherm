import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { VoiceCaptureRing, type VoiceCaptureRingState } from "../../voice/VoiceCaptureRing";
import {
  createMocaSpeechRecognition,
  isMocaSpeechRecognitionAvailable,
  type MocaNamingCapture,
} from "../../../lib/moca-speech-recognition";
import { scoreNaming } from "../../../lib/moca-naming-scoring";
import { spacing } from "../../../theme/spacing";
import {
  MocaInlineAlert,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskCaption,
  MocaTaskFooter,
  MocaTaskFrame,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
} from "./MocaSectionChrome";
import { MocaVoiceMicButton } from "./MocaVoiceMicButton";

const NAMING_IMAGE = require("../../../../assets/images/lion-rhino-camel.png");

type SpeakPhase = "idle" | "speaking" | "error";

type MocaNamingTaskProps = {
  capture: MocaNamingCapture;
  onCaptureChange: (capture: MocaNamingCapture) => void;
};

export function MocaNamingTask({ capture, onCaptureChange }: MocaNamingTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<SpeakPhase>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;

  const hasCapture = capture.transcript.trim().length > 0;
  const speaking = phase === "speaking";

  const displayTranscript = useMemo(() => {
    const base = capture.transcript.trim();
    const interim = interimTranscript.trim();
    if (!interim) return base;
    if (!base) return interim;
    return `${base} ${interim}`;
  }, [capture.transcript, interimTranscript]);

  const ringState: VoiceCaptureRingState = speaking
    ? "active"
    : hasCapture
      ? "complete"
      : "idle";

  const stopSpeaking = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setPhase("idle");
  }, []);

  const startSpeaking = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");

    if (!speechAvailable) {
      setPhase("error");
      setErrorMessage(
        Platform.OS === "web"
          ? "Speech recognition is not available in this browser. Try Chrome or Edge."
          : "Live speech naming is web-first for now. Open MoCA in Chrome on your phone or desktop to test.",
      );
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        const transcript = [captureRef.current.transcript, text]
          .filter(Boolean)
          .join(" ")
          .trim();
        onCaptureChange(scoreNaming(transcript));
        setInterimTranscript("");
      },
      onInterimTranscript: setInterimTranscript,
      onError: (message) => {
        setErrorMessage(message);
        setPhase("error");
        recognitionRef.current = null;
        setInterimTranscript("");
      },
      onEnd: () => {
        recognitionRef.current = null;
        setInterimTranscript("");
        setPhase("idle");
      },
    });

    if (!recognition) {
      setPhase("error");
      setErrorMessage("Could not start speech recognition.");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("speaking");
    recognition.start();
  }, [onCaptureChange, speechAvailable]);

  function redoCapture() {
    stopSpeaking();
    setErrorMessage(null);
    onCaptureChange(scoreNaming(""));
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="NAMING" />

      <MocaTaskPrompt>
        Tell me the name of each animal shown in the picture below.
      </MocaTaskPrompt>

      <MocaTaskFrame>
        <Image
          accessibilityLabel="Line drawings of a lion, rhinoceros, and camel"
          contentFit="contain"
          source={NAMING_IMAGE}
          style={styles.image}
        />
      </MocaTaskFrame>

      <MocaTaskCaption>Your response</MocaTaskCaption>

      <View style={styles.responseBlock}>
        <VoiceCaptureRing
          activeLabel="Speaking"
          completeLabel="Captured"
          idleLabel="Ready when you are"
          progress={ringState === "idle" ? 0 : 1}
          state={ringState}
        />

        <View style={styles.controls}>
          {speaking ? (
            <MocaVoiceMicButton label="Stop" variant="stop" onPress={stopSpeaking} />
          ) : (
            <MocaVoiceMicButton
              disabled={!speechAvailable}
              label={hasCapture ? "Speak again" : "Start speaking"}
              variant={hasCapture ? "outline" : "primary"}
              onPress={startSpeaking}
            />
          )}
        </View>

        {displayTranscript ? (
          <MocaVoiceStatus
            body={displayTranscript}
            footer={
              capture.detectedAnimals.length > 0
                ? `Detected: ${capture.detectedAnimals.join(", ")}`
                : undefined
            }
            label={hasCapture ? "Your response" : "Live transcript"}
          />
        ) : null}

        {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
      </View>

      {hasCapture && !speaking ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={redoCapture} />
        </MocaTaskFooter>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  image: {
    aspectRatio: 2.4,
    width: "100%",
  },
  responseBlock: {
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  controls: {
    alignItems: "center",
    paddingBottom: spacing.xs,
    width: "100%",
  },
});

import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { VoiceCaptureRing, type VoiceCaptureRingState } from "../../voice/VoiceCaptureRing";
import {
  createMocaSpeechRecognition,
  getMocaSpeechUnavailableMessage,
  isMocaSpeechRecognitionAvailable,
  MOCA_NATIVE_STT_REBUILD_MESSAGE,
  type MocaNamingCapture,
} from "../../../lib/moca-speech-recognition";
import { completeNamingCapture, scoreNaming } from "../../../lib/moca-naming-scoring";
import { radius, spacing } from "../../../theme/spacing";
import {
  MocaInlineAlert,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFrame,
  MocaTaskPrompt,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(
    !speechAvailable ? MOCA_NATIVE_STT_REBUILD_MESSAGE : null,
  );
  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;

  const speaking = phase === "speaking";
  const finished = capture.completedAt !== null;

  const ringState: VoiceCaptureRingState = speaking
    ? "active"
    : finished
      ? "complete"
      : "idle";

  const finalizeCapture = useCallback(() => {
    const interim = interimTranscript.trim();
    const transcript = [captureRef.current.transcript, interim]
      .filter(Boolean)
      .join(" ")
      .trim();
    onCaptureChange(completeNamingCapture(scoreNaming(transcript)));
  }, [interimTranscript, onCaptureChange]);

  const stopSpeaking = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    finalizeCapture();
    setInterimTranscript("");
    setPhase("idle");
  }, [finalizeCapture]);

  const startSpeaking = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");
    onCaptureChange({ ...captureRef.current, completedAt: null });

    if (!speechAvailable) {
      setPhase("error");
      setErrorMessage(getMocaSpeechUnavailableMessage());
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
      setErrorMessage(getMocaSpeechUnavailableMessage());
      return;
    }

    recognitionRef.current = recognition;
    setPhase("speaking");
    recognition.start();
  }, [onCaptureChange, speechAvailable]);

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

      <View style={styles.responseBlock}>
        <Pressable
          accessibilityHint="Starts speech capture for animal naming"
          accessibilityRole="button"
          disabled={speaking || finished}
          onPress={startSpeaking}
          style={({ pressed }) => [
            styles.ringPressable,
            pressed && !speaking && !finished && styles.ringPressed,
          ]}
        >
          <VoiceCaptureRing
            activeLabel="Listening"
            completeLabel="Done"
            idleLabel={speechAvailable ? "Tap to speak" : "Speech unavailable"}
            progress={ringState === "idle" ? 0 : 1}
            state={ringState}
          />
        </Pressable>

        <View style={styles.controls}>
          {speaking ? (
            <MocaVoiceMicButton label="Stop" variant="stop" onPress={stopSpeaking} />
          ) : finished ? null : (
            <MocaVoiceMicButton label="Start speaking" variant="primary" onPress={startSpeaking} />
          )}
        </View>

        {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
      </View>
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
  ringPressable: {
    alignItems: "center",
    borderRadius: radius.lg,
  },
  ringPressed: {
    opacity: 0.92,
  },
  controls: {
    alignItems: "center",
    paddingBottom: spacing.xs,
    width: "100%",
  },
});

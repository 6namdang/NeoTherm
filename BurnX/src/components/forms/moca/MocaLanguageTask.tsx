import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { MOCA_LANGUAGE_SENTENCES, type MocaLanguageCapture } from "../../../constants/forms/moca";
import {
  emptyLanguageCapture,
  finalizeLanguageCapture,
  scoreLanguageSentence,
} from "../../../lib/moca-language-scoring";
import {
  createMocaSpeechRecognition,
  isMocaSpeechRecognitionAvailable,
} from "../../../lib/moca-speech-recognition";
import {
  runLanguageSentence1Script,
  runLanguageSentence2Script,
  stopMocaSpeech,
} from "../../../lib/moca-speech-synthesis";
import { spacing } from "../../../theme/spacing";
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

type LanguagePhase =
  | "ready"
  | "sentence1_listen"
  | "sentence1_repeat"
  | "sentence2_listen"
  | "sentence2_repeat"
  | "complete";

type ActiveSentence = "sentence1" | "sentence2";

type MocaLanguageTaskProps = {
  capture: MocaLanguageCapture;
  onCaptureChange: (capture: MocaLanguageCapture) => void;
};

function sentenceFooter(result: MocaLanguageCapture["sentence1"]): string | undefined {
  if (!result.transcript.trim()) return undefined;
  if (result.correct) return "Exact match";
  const parts: string[] = [];
  if (result.missingWords.length > 0) parts.push(`Missing: ${result.missingWords.join(", ")}`);
  if (result.extraWords.length > 0) parts.push(`Extra: ${result.extraWords.join(", ")}`);
  return parts.length > 0 ? parts.join(" · ") : "Not an exact match";
}

export function MocaLanguageTask({ capture, onCaptureChange }: MocaLanguageTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<LanguagePhase>("ready");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceCue, setVoiceCue] = useState("");
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureRef = useRef(capture);
  captureRef.current = capture;

  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);
  const activeSentenceRef = useRef<ActiveSentence | null>(null);

  const listening = voiceActive;
  const isRepeatPhase = phase === "sentence1_repeat" || phase === "sentence2_repeat";
  const sentenceLabel = phase.startsWith("sentence2") ? "Sentence 2" : "Sentence 1";

  const activeSentenceKey: ActiveSentence | null =
    phase === "sentence1_repeat" ? "sentence1" : phase === "sentence2_repeat" ? "sentence2" : null;

  const activeSentence = activeSentenceKey ? capture[activeSentenceKey] : null;

  const displayTranscript = useMemo(() => {
    if (!activeSentence) return "";
    const base = activeSentence.transcript.trim();
    const interim = interimTranscript.trim();
    if (!interim) return base;
    if (!base) return interim;
    return `${base} ${interim}`;
  }, [activeSentence, interimTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setRecording(false);
  }, []);

  const updateSentenceCapture = useCallback(
    (key: ActiveSentence, transcript: string) => {
      const expected =
        key === "sentence1" ? MOCA_LANGUAGE_SENTENCES[0] : MOCA_LANGUAGE_SENTENCES[1];
      onCaptureChange({
        ...captureRef.current,
        [key]: scoreLanguageSentence(transcript, expected),
      });
    },
    [onCaptureChange],
  );

  const startRecording = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");

    const key = activeSentenceRef.current;
    if (!key) return;

    if (!speechAvailable) {
      setErrorMessage(
        Platform.OS === "web"
          ? "Speech recognition is not available in this browser. Try Chrome or Edge."
          : "Live speech capture is web-first for now. Open MoCA in Chrome to test sentence repetition.",
      );
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        const current = captureRef.current[key].transcript;
        const transcript = [current, text].filter(Boolean).join(" ").trim();
        updateSentenceCapture(key, transcript);
        setInterimTranscript("");
      },
      onInterimTranscript: setInterimTranscript,
      onError: (message) => {
        setErrorMessage(message);
        recognitionRef.current = null;
        setInterimTranscript("");
        setRecording(false);
      },
      onEnd: () => {
        recognitionRef.current = null;
        setInterimTranscript("");
        setRecording(false);
      },
    });

    if (!recognition) {
      setErrorMessage("Could not start speech recognition.");
      return;
    }

    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }, [speechAvailable, updateSentenceCapture]);

  const playSentence1Script = useCallback(() => {
    setErrorMessage(null);
    setVoiceActive(true);
    setVoiceCue("Sentence 1 — listen carefully.");
    runLanguageSentence1Script({
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceActive(false);
        setVoiceCue("");
        activeSentenceRef.current = "sentence1";
        setPhase("sentence1_repeat");
      },
      onError: (message) => {
        setVoiceActive(false);
        setVoiceCue("");
        setErrorMessage(message);
      },
    });
  }, []);

  const playSentence2Script = useCallback(() => {
    setErrorMessage(null);
    setVoiceActive(true);
    setVoiceCue("Sentence 2 — listen carefully.");
    runLanguageSentence2Script({
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceActive(false);
        setVoiceCue("");
        activeSentenceRef.current = "sentence2";
        setPhase("sentence2_repeat");
      },
      onError: (message) => {
        setVoiceActive(false);
        setVoiceCue("");
        setErrorMessage(message);
      },
    });
  }, []);

  const beginSentence1 = useCallback(() => {
    onCaptureChange(emptyLanguageCapture());
    setPhase("sentence1_listen");
    playSentence1Script();
  }, [onCaptureChange, playSentence1Script]);

  const beginSentence2 = useCallback(() => {
    updateSentenceCapture("sentence2", "");
    setPhase("sentence2_listen");
    playSentence2Script();
  }, [playSentence2Script, updateSentenceCapture]);

  const resetTask = useCallback(() => {
    stopRecording();
    stopMocaSpeech();
    setVoiceActive(false);
    setVoiceCue("");
    setErrorMessage(null);
    setInterimTranscript("");
    activeSentenceRef.current = null;
    setPhase("ready");
    onCaptureChange(emptyLanguageCapture());
  }, [onCaptureChange, stopRecording]);

  const stopAndAdvance = useCallback(() => {
    stopRecording();
    const key = activeSentenceRef.current;
    if (key === "sentence1") {
      activeSentenceRef.current = null;
      beginSentence2();
    } else if (key === "sentence2") {
      activeSentenceRef.current = null;
      onCaptureChange(
        finalizeLanguageCapture(captureRef.current.sentence1, captureRef.current.sentence2),
      );
      setPhase("complete");
    }
  }, [beginSentence2, onCaptureChange, stopRecording]);

  useEffect(() => {
    return () => {
      stopMocaSpeech();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const canStartOver =
    phase !== "ready" &&
    !listening &&
    !recording &&
    phase !== "sentence1_listen" &&
    phase !== "sentence2_listen";

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
        onPress: beginSentence1,
      };
    }
    if (isRepeatPhase && recording) {
      return {
        kind: "mic" as const,
        label: "Stop",
        disabled: false,
        variant: "stop" as const,
        onPress: stopAndAdvance,
      };
    }
    if (isRepeatPhase && !recording) {
      return {
        kind: "mic" as const,
        label: "Start recording",
        disabled: !speechAvailable,
        variant: "primary" as const,
        onPress: startRecording,
      };
    }
    return null;
  })();

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="LANGUAGE" />

      <MocaTaskPrompt>
        Listen to each sentence, then repeat it exactly as you heard it — word for word.
      </MocaTaskPrompt>

      <MocaTaskCaption>{sentenceLabel}</MocaTaskCaption>

      {listening ? (
        <MocaMemoryListenRow cue={voiceCue || "Listen carefully…"} />
      ) : null}

      <MocaMemoryPanel>
        {recording ? <MocaMemoryRecordingRow /> : null}

        {displayTranscript ? (
          <MocaVoiceStatus
            body={displayTranscript}
            footer={activeSentence ? sentenceFooter(activeSentence) : undefined}
            label="Your repetition"
          />
        ) : null}

        {phase === "complete" ? (
          <View style={styles.summaryStack}>
            <MocaVoiceStatus
              body={capture.sentence1.transcript || "—"}
              footer={sentenceFooter(capture.sentence1)}
              label="Sentence 1"
            />
            <MocaVoiceStatus
              body={capture.sentence2.transcript || "—"}
              footer={sentenceFooter(capture.sentence2)}
              label="Sentence 2"
            />
            <MocaInlineNote>
              MoCA score: {capture.score} / 2 points (1 point per exact repetition)
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
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.xs,
    width: "100%",
  },
  summaryStack: {
    gap: spacing.md,
  },
});

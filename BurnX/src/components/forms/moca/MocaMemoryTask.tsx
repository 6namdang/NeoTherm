import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  MOCA_MEMORY_RECALL_DELAY_MS,
  type MocaMemoryCapture,
  type MocaMemoryTrialCapture,
} from "../../../constants/forms/moca";
import { detectMemoryWords, emptyMemoryTrialCapture } from "../../../lib/moca-memory-scoring";
import {
  createMocaSpeechRecognition,
  isMocaSpeechRecognitionAvailable,
} from "../../../lib/moca-speech-recognition";
import {
  runMemoryTrial1Script,
  runMemoryTrial2Script,
  stopMocaSpeech,
} from "../../../lib/moca-speech-synthesis";
import { spacing } from "../../../theme/spacing";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaInlineNote,
  MocaMemoryDelayRow,
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

type MemoryPhase =
  | "ready"
  | "trial1_listen"
  | "trial1_repeat"
  | "trial1_complete"
  | "trial2_listen"
  | "trial2_repeat"
  | "trial2_complete"
  | "delay"
  | "learning_complete";

type MocaMemoryTaskProps = {
  capture: MocaMemoryCapture;
  onCaptureChange: (capture: MocaMemoryCapture) => void;
};

function formatCountdown(remainMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function trialFooter(trial: MocaMemoryTrialCapture): string | undefined {
  if (trial.detectedWords.length === 0) return undefined;
  return `Detected: ${trial.detectedWords.join(", ")}`;
}

export function MocaMemoryTask({ capture, onCaptureChange }: MocaMemoryTaskProps) {
  const speechAvailable = isMocaSpeechRecognitionAvailable();
  const [phase, setPhase] = useState<MemoryPhase>("ready");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceCue, setVoiceCue] = useState("");
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const captureRef = useRef(capture);
  captureRef.current = capture;

  const recognitionRef = useRef<ReturnType<typeof createMocaSpeechRecognition>>(null);
  const activeTrialRef = useRef<"trial1" | "trial2" | null>(null);

  const recallRemainMs =
    capture.recallAvailableAt === null ? 0 : Math.max(0, capture.recallAvailableAt - nowMs);

  useEffect(() => {
    if (phase !== "delay" || capture.recallAvailableAt === null) return;
    const tick = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(tick);
  }, [capture.recallAvailableAt, phase]);

  useEffect(() => {
    if (phase !== "delay" || capture.recallAvailableAt === null) return;
    if (recallRemainMs > 0) return;
    setPhase("learning_complete");
  }, [capture.recallAvailableAt, phase, recallRemainMs]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript("");
    setRecording(false);
  }, []);

  const updateTrialCapture = useCallback(
    (key: "trial1" | "trial2", transcript: string) => {
      onCaptureChange({
        ...captureRef.current,
        [key]: {
          transcript,
          detectedWords: detectMemoryWords(transcript),
        },
      });
    },
    [onCaptureChange],
  );

  const startRecording = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");

    const key = activeTrialRef.current;
    if (!key) return;

    if (!speechAvailable) {
      setErrorMessage(
        Platform.OS === "web"
          ? "Speech recognition is not available in this browser. Try Chrome or Edge."
          : "Live speech capture is web-first for now. Open MoCA in Chrome to test memory recall.",
      );
      return;
    }

    const recognition = createMocaSpeechRecognition({
      onFinalTranscript: (text) => {
        const current = captureRef.current[key].transcript;
        const transcript = [current, text].filter(Boolean).join(" ").trim();
        updateTrialCapture(key, transcript);
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
  }, [speechAvailable, updateTrialCapture]);

  const playTrial1Script = useCallback(() => {
    setErrorMessage(null);
    setVoiceActive(true);
    setVoiceCue("First trial — please listen.");
    runMemoryTrial1Script({
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceActive(false);
        setVoiceCue("");
        activeTrialRef.current = "trial1";
        setPhase("trial1_repeat");
      },
      onError: (message) => {
        setVoiceActive(false);
        setVoiceCue("");
        setErrorMessage(message);
      },
    });
  }, []);

  const playTrial2Script = useCallback(() => {
    setErrorMessage(null);
    setVoiceActive(true);
    setVoiceCue("Second trial — listen again.");
    runMemoryTrial2Script({
      onCue: setVoiceCue,
      onDone: () => {
        setVoiceActive(false);
        setVoiceCue("");
        activeTrialRef.current = "trial2";
        setPhase("trial2_repeat");
      },
      onError: (message) => {
        setVoiceActive(false);
        setVoiceCue("");
        setErrorMessage(message);
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      stopMocaSpeech();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const activeTrialKey =
    phase === "trial1_repeat" || phase === "trial1_complete"
      ? "trial1"
      : phase === "trial2_repeat" || phase === "trial2_complete"
        ? "trial2"
        : null;

  const activeTrial = activeTrialKey ? capture[activeTrialKey] : null;

  const displayTranscript = useMemo(() => {
    if (!activeTrial) return "";
    const base = activeTrial.transcript.trim();
    const interim = interimTranscript.trim();
    if (!interim) return base;
    if (!base) return interim;
    return `${base} ${interim}`;
  }, [activeTrial, interimTranscript]);

  const listening = voiceActive;

  const phaseCopy = useMemo(() => {
    switch (phase) {
      case "ready":
        return {
          prompt:
            "I am going to read you a list of five words. Listen carefully — the list is read once, then you repeat it. We do two learning trials, then a recall after five minutes.",
          caption: "Word list",
        };
      case "trial1_listen":
      case "trial1_repeat":
      case "trial1_complete":
        return {
          prompt:
            phase === "trial1_listen"
              ? "Pay close attention and concentrate. The words are read slowly, once only — do not repeat yet."
              : phase === "trial1_repeat"
                ? "Repeat all five words aloud, then tap Stop to continue."
                : "Second trial starting…",
          caption: "1st trial",
        };
      case "trial2_listen":
      case "trial2_repeat":
      case "trial2_complete":
        return {
          prompt:
            phase === "trial2_listen"
              ? "Same list again — listen carefully. The words are read once, then you repeat."
              : phase === "trial2_repeat"
                ? "Repeat all five words aloud again, then tap Stop to continue."
                : "Waiting for the five-minute recall.",
          caption: "2nd trial",
        };
      case "delay":
        return {
          prompt:
            "Keep going with other MoCA tasks while you wait. Delayed recall is at the end of the form.",
          caption: `Recall in ${formatCountdown(recallRemainMs)}`,
        };
      case "learning_complete":
        return {
          prompt: "The five-minute delay is complete. Continue to Delayed Recall when ready.",
          caption: "Learning trials complete",
        };
      default:
        return { prompt: "", caption: "Memory" };
    }
  }, [phase, recallRemainMs]);

  function beginTrial1() {
    setPhase("trial1_listen");
    playTrial1Script();
  }

  function beginTrial2() {
    updateTrialCapture("trial2", "");
    setPhase("trial2_listen");
    playTrial2Script();
  }

  function resetMemoryTask() {
    stopRecording();
    stopMocaSpeech();
    setVoiceActive(false);
    setVoiceCue("");
    setErrorMessage(null);
    setInterimTranscript("");
    activeTrialRef.current = null;
    setPhase("ready");
    onCaptureChange({
      trial1: emptyMemoryTrialCapture(),
      trial2: emptyMemoryTrialCapture(),
      delayedRecall: emptyMemoryTrialCapture(),
      recallAvailableAt: null,
    });
  }

  function stopAndAdvance() {
    stopRecording();
    const key = activeTrialRef.current;
    if (key === "trial1") {
      activeTrialRef.current = null;
      beginTrial2();
    } else if (key === "trial2") {
      onCaptureChange({
        ...captureRef.current,
        recallAvailableAt: Date.now() + MOCA_MEMORY_RECALL_DELAY_MS,
      });
      setPhase("delay");
      activeTrialRef.current = null;
    }
  }

  const isRepeatPhase = phase === "trial1_repeat" || phase === "trial2_repeat";

  const canStartOver =
    phase !== "ready" &&
    !listening &&
    !recording &&
    phase !== "trial1_listen" &&
    phase !== "trial2_listen";

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
        label: "Begin 1st trial",
        disabled: false,
        onPress: beginTrial1,
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
      <MocaSectionHeader title="MEMORY" />

      <MocaTaskPrompt>{phaseCopy.prompt}</MocaTaskPrompt>
      <MocaTaskCaption>{phaseCopy.caption}</MocaTaskCaption>

      <MocaMemoryPanel>
        {listening ? <MocaMemoryListenRow cue={voiceCue || "Listen carefully…"} /> : null}

        {phase === "delay" ? (
          <MocaMemoryDelayRow countdown={formatCountdown(recallRemainMs)} />
        ) : null}

        {recording ? <MocaMemoryRecordingRow /> : null}

        {displayTranscript ? (
          <MocaVoiceStatus
            body={displayTranscript}
            footer={activeTrial ? trialFooter(activeTrial) : undefined}
            label="Live transcript"
          />
        ) : null}

        {phase === "delay" ? (
          <MocaInlineNote>
            MoCA requires a five-minute delay before delayed recall. Continue with other sections
            while you wait, then continue to Delayed Recall.
          </MocaInlineNote>
        ) : null}

        {phase === "learning_complete" ? (
          <View style={styles.summaryStack}>
            <MocaVoiceStatus
              body={capture.trial1.transcript || "—"}
              footer={trialFooter(capture.trial1)}
              label="1st trial"
            />
            <MocaVoiceStatus
              body={capture.trial2.transcript || "—"}
              footer={trialFooter(capture.trial2)}
              label="2nd trial"
            />
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
          <MocaTaskLink label="Start over" onPress={resetMemoryTask} />
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

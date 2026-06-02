import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  MOCA_VIGILANCE_LETTERS,
  type MocaVigilanceCapture,
  type MocaVigilanceTap,
} from "../../../constants/forms/moca";
import { emptyVigilanceCapture, scoreVigilance } from "../../../lib/moca-vigilance-scoring";
import { runVigilanceScript, stopMocaSpeech } from "../../../lib/moca-speech-synthesis";
import { colors } from "../../../theme/colors";
import { fontFamily } from "../../../theme/fontFamily";
import { radius, spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaInlineNote,
  MocaMemoryListenRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFooter,
  MocaTaskFrame,
  MocaTaskLink,
  MocaTaskPrompt,
  MocaVoiceStatus,
} from "./MocaSectionChrome";

type VigilancePhase = "ready" | "instructions" | "running" | "complete";

type MocaVigilanceTaskProps = {
  capture: MocaVigilanceCapture;
  onCaptureChange: (capture: MocaVigilanceCapture) => void;
};

const TARGET_COUNT = MOCA_VIGILANCE_LETTERS.filter((letter) => letter === "A").length;

const VIGILANCE_INSTRUCTIONS =
  "I am going to read a sequence of letters. Every time you hear the letter A, tap in the box below. If you hear a different letter, do not tap in the box.";

export function MocaVigilanceTask({ capture, onCaptureChange }: MocaVigilanceTaskProps) {
  const [phase, setPhase] = useState<VigilancePhase>("ready");
  const [voiceCue, setVoiceCue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tapFlash, setTapFlash] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);

  const tapsRef = useRef<MocaVigilanceTap[]>([]);
  const activeLetterIndexRef = useRef<number | null>(null);
  const tapFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canTap = phase === "running";
  const canStartOver = phase !== "ready" && phase !== "instructions" && phase !== "running";

  const resetTask = useCallback(() => {
    stopMocaSpeech();
    if (tapFlashTimerRef.current) {
      clearTimeout(tapFlashTimerRef.current);
      tapFlashTimerRef.current = null;
    }
    tapsRef.current = [];
    activeLetterIndexRef.current = null;
    setPhase("ready");
    setVoiceCue("");
    setErrorMessage(null);
    setTapFlash(false);
    setShowDetails(false);
    setProgressIndex(0);
    onCaptureChange(emptyVigilanceCapture());
  }, [onCaptureChange]);

  const flashTap = useCallback(() => {
    setTapFlash(true);
    if (tapFlashTimerRef.current) clearTimeout(tapFlashTimerRef.current);
    tapFlashTimerRef.current = setTimeout(() => {
      setTapFlash(false);
      tapFlashTimerRef.current = null;
    }, 180);
  }, []);

  const onTapZonePress = useCallback(() => {
    if (!canTap || activeLetterIndexRef.current === null) return;

    tapsRef.current = [
      ...tapsRef.current,
      { letterIndex: activeLetterIndexRef.current, timestampMs: Date.now() },
    ];
    flashTap();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [canTap, flashTap]);

  const beginTask = useCallback(() => {
    setErrorMessage(null);
    tapsRef.current = [];
    activeLetterIndexRef.current = null;
    setProgressIndex(0);
    setPhase("instructions");
    onCaptureChange(emptyVigilanceCapture());

    runVigilanceScript({
      onCue: setVoiceCue,
      onLetterStart: (index) => {
        activeLetterIndexRef.current = index;
        setProgressIndex(index + 1);
        setPhase("running");
      },
      onLetterEnd: () => {
        activeLetterIndexRef.current = null;
      },
      onDone: () => {
        activeLetterIndexRef.current = null;
        const scored = scoreVigilance(MOCA_VIGILANCE_LETTERS, tapsRef.current);
        onCaptureChange(scored);
        setPhase("complete");
        setVoiceCue("");
      },
      onError: (message) => {
        setErrorMessage(message);
        setPhase("ready");
      },
    });
  }, [onCaptureChange]);

  const omissionCount =
    capture.letterResults.filter((result) => result.error === "omission").length;
  const commissionCount =
    capture.letterResults.filter((result) => result.error === "commission").length;

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="ATTENTION" />

      <MocaTaskPrompt>{VIGILANCE_INSTRUCTIONS}</MocaTaskPrompt>

      {phase === "instructions" ? (
        <View style={styles.statusBlock}>
          <MocaMemoryListenRow cue={voiceCue || "Instructions are being read aloud."} />
        </View>
      ) : null}

      {phase === "running" ? (
        <View style={styles.statusBlock}>
          <Text style={[typography.caption, styles.progressLabel]}>
            Letter {progressIndex} of {MOCA_VIGILANCE_LETTERS.length}
          </Text>
          {voiceCue ? (
            <Text style={[typography.caption, styles.statusHint]}>{voiceCue}</Text>
          ) : null}
        </View>
      ) : null}

      <MocaTaskFrame>
        <Pressable
          accessibilityHint="Tap in this box when you hear the letter A"
          accessibilityLabel="Vigilance tap box"
          accessibilityRole="button"
          disabled={!canTap}
          onPress={onTapZonePress}
          style={[
            styles.tapZone,
            canTap ? styles.tapZoneActive : null,
            tapFlash ? styles.tapZoneFlash : null,
          ]}
        >
          <Text
            style={[
              typography.body,
              styles.tapLabel,
              canTap ? styles.tapLabelActive : null,
            ]}
          >
            {canTap ? "Tap when you hear A" : "Tap box"}
          </Text>
        </Pressable>
      </MocaTaskFrame>

      {phase === "ready" ? (
        <View style={styles.actionBar}>
          <MocaCompactButton title="Begin" onPress={beginTask} />
        </View>
      ) : null}

      {phase === "complete" && capture.completedAt !== null ? (
        <View style={styles.summaryStack}>
          <MocaVoiceStatus
            body={`${capture.errorCount} error${capture.errorCount === 1 ? "" : "s"} (${omissionCount} missed A, ${commissionCount} wrong tap)`}
            footer={`MoCA score: ${capture.score} / 1 point (${TARGET_COUNT} letter A targets)`}
            label="Result"
          />
          <MocaInlineNote>
            {capture.score === 1
              ? "Zero or one error — full vigilance point."
              : "Two or more errors — no vigilance point."}
          </MocaInlineNote>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowDetails((prev) => !prev)}
            style={styles.detailsToggle}
          >
            <Text style={[typography.caption, styles.detailsToggleText]}>
              {showDetails ? "Hide letter breakdown" : "Show letter breakdown"}
            </Text>
          </Pressable>
          {showDetails ? (
            <View style={styles.detailsList}>
              {capture.letterResults.map((result) => (
                <Text key={result.index} style={[typography.caption, styles.detailRow]}>
                  #{result.index + 1} {result.letter}
                  {result.isTarget ? " (A)" : ""}
                  {" — "}
                  {result.error === "none"
                    ? result.isTarget
                      ? "tapped"
                      : "no tap"
                    : result.error === "omission"
                      ? "missed"
                      : "wrong tap"}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}

      {canStartOver ? (
        <MocaTaskFooter>
          <MocaTaskLink label="Start over" onPress={resetTask} />
        </MocaTaskFooter>
      ) : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  statusBlock: {
    gap: spacing.xs,
    width: "100%",
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semiBold,
    textAlign: "center",
  },
  statusHint: {
    color: colors.textMuted,
    textAlign: "center",
  },
  actionBar: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: "100%",
  },
  tapZone: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: "100%",
  },
  tapZoneActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  tapZoneFlash: {
    backgroundColor: colors.ring,
  },
  tapLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.semiBold,
    textAlign: "center",
  },
  tapLabelActive: {
    color: colors.primary,
    fontSize: 18,
  },
  summaryStack: {
    gap: spacing.sm,
    width: "100%",
  },
  detailsToggle: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  detailsToggleText: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  detailsList: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    gap: spacing.xs,
    padding: spacing.md,
  },
  detailRow: {
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
    lineHeight: 18,
  },
});

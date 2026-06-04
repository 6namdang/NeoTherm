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
import { spacing } from "../../../theme/spacing";
import { typography } from "../../../theme/typography";
import {
  MocaCompactButton,
  MocaInlineAlert,
  MocaMemoryListenRow,
  MocaSectionHeader,
  MocaSectionRoot,
  MocaTaskFrame,
  MocaTaskPrompt,
} from "./MocaSectionChrome";

type VigilancePhase = "ready" | "instructions" | "running" | "complete";

type MocaVigilanceTaskProps = {
  capture: MocaVigilanceCapture;
  onCaptureChange: (capture: MocaVigilanceCapture) => void;
};

const VIGILANCE_INSTRUCTIONS =
  "I am going to read a sequence of letters. Every time you hear the letter A, tap in the box below. If you hear a different letter, do not tap in the box.";

export function MocaVigilanceTask({ capture, onCaptureChange }: MocaVigilanceTaskProps) {
  const [phase, setPhase] = useState<VigilancePhase>("ready");
  const [voiceCue, setVoiceCue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tapFlash, setTapFlash] = useState(false);

  const tapsRef = useRef<MocaVigilanceTap[]>([]);
  const activeLetterIndexRef = useRef<number | null>(null);
  const tapFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canTap = phase === "running";

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
    setVoiceCue("");
    setPhase("instructions");
    onCaptureChange(emptyVigilanceCapture());

    runVigilanceScript({
      onCue: setVoiceCue,
      onLetterStart: (index) => {
        activeLetterIndexRef.current = index;
        setPhase("running");
        setVoiceCue("");
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
        setVoiceCue("");
      },
    });
  }, [onCaptureChange]);

  return (
    <MocaSectionRoot>
      <MocaSectionHeader title="ATTENTION" />

      {phase === "ready" ? (
        <MocaTaskPrompt>{VIGILANCE_INSTRUCTIONS}</MocaTaskPrompt>
      ) : null}

      {phase === "instructions" ? (
        <View style={styles.statusBlock}>
          <MocaMemoryListenRow cue={voiceCue || "Instructions are being read aloud."} />
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

      {errorMessage ? <MocaInlineAlert message={errorMessage} /> : null}
    </MocaSectionRoot>
  );
}

const styles = StyleSheet.create({
  statusBlock: {
    gap: spacing.xs,
    width: "100%",
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
});

/**
 * Scores a saved tap sequence against the canonical MoCA trail order.
 * UI records raw taps only; validation runs here (or on the server) at submit time.
 */

import {
  MOCA_MAX_AUTOMATED_SCORE,
  MOCA_TRAIL_SEQUENCE,
  type MocaTrailNodeId,
} from "../constants/forms/moca";
import type { MocaRunnerState } from "./moca-runner-state";

export type MocaTrailScoreResult = {
  sequence: readonly string[];
  errors: number;
  isComplete: boolean;
  isCorrect: boolean;
  score: 0 | 1;
};

export function nextExpectedTrailNode(
  sequence: readonly string[],
): MocaTrailNodeId | null {
  if (sequence.length >= MOCA_TRAIL_SEQUENCE.length) return null;
  return MOCA_TRAIL_SEQUENCE[sequence.length] ?? null;
}

export function isValidTrailTap(
  sequence: readonly string[],
  nodeId: string,
): boolean {
  const expected = nextExpectedTrailNode(sequence);
  return expected !== null && nodeId === expected;
}

export function scoreMocaTrail(
  sequence: readonly string[],
): MocaTrailScoreResult {
  const isComplete = sequence.length === MOCA_TRAIL_SEQUENCE.length;
  const isCorrect =
    isComplete && sequence.every((id, i) => id === MOCA_TRAIL_SEQUENCE[i]);
  return {
    sequence,
    errors: 0,
    isComplete,
    isCorrect,
    score: isCorrect ? 1 : 0,
  };
}

/** Sum on-device scored MoCA sections (max 21 — excludes cube/clock/orientation/education). */
export function computeMocaTotalScore(state: MocaRunnerState): number {
  const trail = scoreMocaTrail(state.trailSequence);
  const namingScore = state.namingCapture.score;
  const digitForward = state.digitSpanCapture.forward.score;
  const digitBackward = state.digitSpanCapture.backwardAdministered
    ? (state.digitSpanCapture.backward?.score ?? 0)
    : 0;
  const delayedScore = state.memoryCapture.delayedRecall.detectedWords.length;

  return (
    trail.score +
    namingScore +
    digitForward +
    digitBackward +
    state.vigilanceCapture.score +
    state.serial7Capture.score +
    state.languageCapture.score +
    state.verbalFluencyCapture.score +
    state.abstractionCapture.score +
    delayedScore
  );
}

export function clampAutomatedMocaScore(score: number): number {
  return Math.min(MOCA_MAX_AUTOMATED_SCORE, Math.max(0, score));
}

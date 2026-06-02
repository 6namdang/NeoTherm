import {
  MOCA_CLOCK_TIME_PROMPT,
  MOCA_FORM_ID,
  MOCA_MAX_AUTOMATED_SCORE,
  type MocaAbstractionCapture,
  type MocaDigitSpanCapture,
  type MocaDrawingStroke,
  type MocaLanguageCapture,
  type MocaMemoryCapture,
  type MocaSerial7Capture,
  type MocaVerbalFluencyCapture,
  type MocaVigilanceCapture,
} from "../constants/forms/moca";
import type { MocaNamingCapture } from "./moca-speech-recognition";
import { clampAutomatedMocaScore, computeMocaTotalScore, scoreMocaTrail } from "./moca-scoring";

import type { MocaRunnerState } from "./moca-runner-state";

export type MocaSubmitPayload = {
  client_platform: string;
  submitted_at_client_ms: number;
  visuospatial_trail: ReturnType<typeof scoreMocaTrail>;
  visuospatial_cube: { strokes: MocaDrawingStroke[] };
  visuospatial_clock: { prompt: string; strokes: MocaDrawingStroke[] };
  naming: MocaNamingCapture;
  memory: {
    trial1: MocaMemoryCapture["trial1"];
    trial2: MocaMemoryCapture["trial2"];
    recall_available_at: number;
    delayed_recall: MocaMemoryCapture["delayedRecall"];
    delayed_recall_score: number;
  };
  digit_span: MocaDigitSpanCapture;
  vigilance: MocaVigilanceCapture;
  serial7: MocaSerial7Capture;
  language: MocaLanguageCapture;
  verbal_fluency: MocaVerbalFluencyCapture;
  abstraction: MocaAbstractionCapture;
  total_score: number;
  max_automated_score: number;
};

export type BuildMocaSubmitPayloadOptions = {
  clientPlatform?: string;
  submittedAtClientMs?: number;
};

export function buildMocaSubmitPayload(
  state: MocaRunnerState,
  options: BuildMocaSubmitPayloadOptions = {},
): MocaSubmitPayload {
  const trail = scoreMocaTrail(state.trailSequence);
  const total = clampAutomatedMocaScore(computeMocaTotalScore(state));

  return {
    client_platform: options.clientPlatform ?? "unknown",
    submitted_at_client_ms: options.submittedAtClientMs ?? Date.now(),
    visuospatial_trail: trail,
    visuospatial_cube: { strokes: state.cubeStrokes },
    visuospatial_clock: {
      prompt: MOCA_CLOCK_TIME_PROMPT,
      strokes: state.clockStrokes,
    },
    naming: state.namingCapture,
    memory: {
      trial1: state.memoryCapture.trial1,
      trial2: state.memoryCapture.trial2,
      recall_available_at: state.memoryCapture.recallAvailableAt!,
      delayed_recall: state.memoryCapture.delayedRecall,
      delayed_recall_score: state.memoryCapture.delayedRecall.detectedWords.length,
    },
    digit_span: state.digitSpanCapture,
    vigilance: state.vigilanceCapture,
    serial7: state.serial7Capture,
    language: state.languageCapture,
    verbal_fluency: state.verbalFluencyCapture,
    abstraction: state.abstractionCapture,
    total_score: total,
    max_automated_score: MOCA_MAX_AUTOMATED_SCORE,
  };
}

export function buildMocaFormResponse(
  state: MocaRunnerState,
  options: BuildMocaSubmitPayloadOptions = {},
) {
  return {
    form_id: MOCA_FORM_ID,
    answers: buildMocaSubmitPayload(state, options) as unknown as Record<string, unknown>,
  };
}

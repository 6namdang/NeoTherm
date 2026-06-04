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

const MAX_POINTS_PER_STROKE = 80;

/**
 * Downsample a stroke to at most `maxPoints` using Ramer-Douglas-Peucker-style
 * uniform sampling. Keeps first and last point to preserve shape boundaries.
 */
function downsampleStroke(stroke: MocaDrawingStroke, maxPoints: number): MocaDrawingStroke {
  const { points } = stroke;
  if (points.length <= maxPoints) return stroke;
  const sampled: Array<{ x: number; y: number }> = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    sampled.push(points[Math.round(i * step)]!);
  }
  sampled.push(points[points.length - 1]!);
  return { points: sampled };
}

function compactStrokes(strokes: MocaDrawingStroke[]): MocaDrawingStroke[] {
  return strokes.map((s) => downsampleStroke(s, MAX_POINTS_PER_STROKE));
}

/** Round normalized coordinates to 4 decimal places to save bytes. */
function roundStrokeCoords(strokes: MocaDrawingStroke[]): MocaDrawingStroke[] {
  return strokes.map((s) => ({
    points: s.points.map((p) => ({
      x: Math.round(p.x * 10000) / 10000,
      y: Math.round(p.y * 10000) / 10000,
    })),
  }));
}

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
    visuospatial_cube: { strokes: roundStrokeCoords(compactStrokes(state.cubeStrokes)) },
    visuospatial_clock: {
      prompt: MOCA_CLOCK_TIME_PROMPT,
      strokes: roundStrokeCoords(compactStrokes(state.clockStrokes)),
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

import type {
  MocaAbstractionCapture,
  MocaDigitSpanCapture,
  MocaDrawingStroke,
  MocaLanguageCapture,
  MocaMemoryCapture,
  MocaSectionId,
  MocaSerial7Capture,
  MocaTrailNodeId,
  MocaVerbalFluencyCapture,
  MocaVigilanceCapture,
} from "../constants/forms/moca";
import { MOCA_TRAIL_SEQUENCE } from "../constants/forms/moca";
import { isDigitSpanBackwardComplete } from "./moca-digit-span-scoring";
import type { MocaNamingCapture } from "./moca-speech-recognition";

/** Captures lifted by MocaFormRunner — used to gate Continue per section. */
export type MocaRunnerCaptures = {
  trailSequence: readonly MocaTrailNodeId[];
  cubeStrokes: MocaDrawingStroke[];
  clockStrokes: MocaDrawingStroke[];
  namingCapture: MocaNamingCapture;
  memoryCapture: MocaMemoryCapture;
  digitSpanCapture: MocaDigitSpanCapture;
  vigilanceCapture: MocaVigilanceCapture;
  serial7Capture: MocaSerial7Capture;
  languageCapture: MocaLanguageCapture;
  verbalFluencyCapture: MocaVerbalFluencyCapture;
  abstractionCapture: MocaAbstractionCapture;
};

/** Whether the current section has enough input to advance (LIBRE-style Continue gate). */
export function isMocaSectionComplete(
  sectionId: MocaSectionId,
  captures: MocaRunnerCaptures,
): boolean {
  switch (sectionId) {
    case "trail":
      return captures.trailSequence.length === MOCA_TRAIL_SEQUENCE.length;
    case "cube":
      return captures.cubeStrokes.length > 0;
    case "clock":
      return captures.clockStrokes.length > 0;
    case "naming":
      return captures.namingCapture.completedAt !== null;
    case "memory":
      return captures.memoryCapture.recallAvailableAt !== null;
    case "digit_span_forward":
      return captures.digitSpanCapture.forward.completedAt !== null;
    case "digit_span_backward":
      return isDigitSpanBackwardComplete(captures.digitSpanCapture);
    case "vigilance":
      return captures.vigilanceCapture.completedAt !== null;
    case "serial7":
      return captures.serial7Capture.completedAt !== null;
    case "language":
      return captures.languageCapture.completedAt !== null;
    case "verbal_fluency":
      return captures.verbalFluencyCapture.completedAt !== null;
    case "abstraction":
      return captures.abstractionCapture.completedAt !== null;
    case "delayed_recall":
      return captures.memoryCapture.delayedRecall.transcript.trim().length > 0;
    default: {
      const _exhaustive: never = sectionId;
      return _exhaustive;
    }
  }
}

export function toMocaRunnerState(captures: MocaRunnerCaptures) {
  return captures;
}

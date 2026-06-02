import { MOCA_TRAIL_SEQUENCE } from "../constants/forms/moca";
import type { MocaRunnerState } from "./moca-runner-state";
import { isDigitSpanBackwardComplete } from "./moca-digit-span-scoring";

export class MocaSubmitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MocaSubmitValidationError";
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new MocaSubmitValidationError(message);
}

/** Reject incomplete or placeholder MoCA state before POST /form-responses. */
export function validateMocaRunnerState(state: MocaRunnerState): void {
  assert(
    state.trailSequence.length === MOCA_TRAIL_SEQUENCE.length,
    "Complete the trail-making task (all 10 nodes).",
  );
  assert(state.cubeStrokes.length > 0, "Draw the cube before submitting.");
  assert(state.clockStrokes.length > 0, "Draw the clock before submitting.");
  assert(
    state.namingCapture.detectedAnimals.length >= 3,
    "Name all three animals before submitting.",
  );
  assert(state.memoryCapture.recallAvailableAt !== null, "Complete both memory learning trials.");
  assert(
    state.memoryCapture.delayedRecall.transcript.trim().length > 0,
    "Submit your delayed recall response before finishing.",
  );
  assert(state.digitSpanCapture.forward.completedAt !== null, "Complete forward digit span.");
  assert(
    isDigitSpanBackwardComplete(state.digitSpanCapture),
    "Complete backward digit span.",
  );
  assert(state.vigilanceCapture.completedAt !== null, "Complete the vigilance task.");
  assert(state.serial7Capture.completedAt !== null, "Complete serial 7s.");
  assert(state.languageCapture.completedAt !== null, "Complete both language sentences.");
  assert(state.verbalFluencyCapture.completedAt !== null, "Complete verbal fluency.");
  assert(state.abstractionCapture.completedAt !== null, "Complete abstraction.");
}

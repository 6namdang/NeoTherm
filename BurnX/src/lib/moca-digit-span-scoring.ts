import {
  MOCA_DIGIT_SPAN_BACKWARD_CORRECT,
  MOCA_DIGIT_SPAN_BACKWARD_READ,
  MOCA_DIGIT_SPAN_BACKWARD_READ_FORWARD_ORDER,
  MOCA_DIGIT_SPAN_FORWARD_CORRECT,
  type MocaDigitSpanCapture,
  type MocaDigitSpanTrialCapture,
} from "../constants/forms/moca";
import { normalizeSpokenDigits } from "./moca-digit-normalization";

export function emptyDigitSpanTrial(): MocaDigitSpanTrialCapture {
  return {
    readSequence: [],
    expected: "",
    transcript: "",
    normalized: "",
    correct: false,
    score: 0,
    completedAt: null,
  };
}

export function emptyDigitSpanCapture(): MocaDigitSpanCapture {
  return {
    forward: {
      ...emptyDigitSpanTrial(),
      readSequence: [...MOCA_DIGIT_SPAN_FORWARD_CORRECT.split("")],
      expected: MOCA_DIGIT_SPAN_FORWARD_CORRECT,
    },
    backward: null,
    backwardAdministered: false,
    backwardSkipped: false,
  };
}

export function scoreDigitSpanForward(transcript: string): MocaDigitSpanTrialCapture {
  const normalized = normalizeSpokenDigits(transcript);
  const correct = normalized === MOCA_DIGIT_SPAN_FORWARD_CORRECT;
  return {
    readSequence: [...MOCA_DIGIT_SPAN_FORWARD_CORRECT.split("")],
    expected: MOCA_DIGIT_SPAN_FORWARD_CORRECT,
    transcript: transcript.trim(),
    normalized,
    correct,
    score: correct ? 1 : 0,
    completedAt: Date.now(),
  };
}

export function applyDigitSpanBackward(
  capture: MocaDigitSpanCapture,
  transcript: string,
): MocaDigitSpanCapture {
  const normalized = normalizeSpokenDigits(transcript);

  if (normalized === MOCA_DIGIT_SPAN_BACKWARD_READ_FORWARD_ORDER) {
    return {
      ...capture,
      backward: null,
      backwardAdministered: false,
      backwardSkipped: true,
    };
  }

  const correct = normalized === MOCA_DIGIT_SPAN_BACKWARD_CORRECT;
  return {
    ...capture,
    backwardAdministered: true,
    backwardSkipped: false,
    backward: {
      readSequence: [...MOCA_DIGIT_SPAN_BACKWARD_READ],
      expected: MOCA_DIGIT_SPAN_BACKWARD_CORRECT,
      transcript: transcript.trim(),
      normalized,
      correct,
      score: correct ? 1 : 0,
      completedAt: Date.now(),
    },
  };
}

export function isDigitSpanBackwardComplete(capture: MocaDigitSpanCapture): boolean {
  if (!capture.forward.completedAt) return false;
  if (capture.backwardSkipped) return true;
  return capture.backwardAdministered && capture.backward?.completedAt != null;
}

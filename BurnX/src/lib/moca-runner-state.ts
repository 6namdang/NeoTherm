import type {
  MocaAbstractionCapture,
  MocaDigitSpanCapture,
  MocaDrawingStroke,
  MocaLanguageCapture,
  MocaMemoryCapture,
  MocaSerial7Capture,
  MocaTrailNodeId,
  MocaVerbalFluencyCapture,
  MocaVigilanceCapture,
} from "../constants/forms/moca";
import type { MocaNamingCapture } from "./moca-speech-recognition";

/** Full MoCA runner state assembled at submit time. */
export type MocaRunnerState = {
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

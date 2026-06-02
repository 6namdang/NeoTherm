import { describe, expect, it } from "vitest";

import {
  MOCA_TRAIL_SEQUENCE,
  type MocaAbstractionCapture,
  type MocaDigitSpanCapture,
  type MocaDrawingStroke,
  type MocaLanguageCapture,
  type MocaMemoryCapture,
  type MocaSerial7Capture,
  type MocaVerbalFluencyCapture,
  type MocaVigilanceCapture,
} from "../constants/forms/moca";
import { buildMocaSubmitPayload } from "./build-moca-submit-payload";
import {
  applyDigitSpanBackward,
  emptyDigitSpanCapture,
  scoreDigitSpanForward,
} from "./moca-digit-span-scoring";
import { scoreNaming } from "./moca-naming-scoring";
import type { MocaRunnerState } from "./moca-runner-state";
import { scoreAbstraction } from "./moca-abstraction-scoring";
import { scoreSerial7 } from "./moca-serial7-scoring";
import { clampAutomatedMocaScore, computeMocaTotalScore } from "./moca-scoring";
import { normalizeSpokenDigits } from "./moca-digit-normalization";
import { scoreVigilance } from "./moca-vigilance-scoring";
import {
  MocaSubmitValidationError,
  validateMocaRunnerState,
} from "./validate-moca-submit-payload";

const STROKE: MocaDrawingStroke = { points: [{ x: 1, y: 2 }] };

function completeMemoryCapture(): MocaMemoryCapture {
  const trial: MocaMemoryCapture["trial1"] = {
    transcript: "face velvet church daisy red",
    detectedWords: ["face", "velvet", "church", "daisy", "red"],
  };
  return {
    trial1: trial,
    trial2: trial,
    delayedRecall: {
      transcript: "face church red",
      detectedWords: ["face", "church", "red"],
    },
    recallAvailableAt: Date.now() - 60_000,
  };
}

function completeDigitSpan(): MocaDigitSpanCapture {
  let capture = emptyDigitSpanCapture();
  capture = {
    ...capture,
    forward: scoreDigitSpanForward("two one eight five four"),
  };
  return applyDigitSpanBackward(capture, "two four seven");
}

function completeVigilance(): MocaVigilanceCapture {
  const letters = "FBACMNAAJKLBAFAKDEAAAMNAA".split("");
  const taps = letters
    .map((_, letterIndex) => ({ letterIndex, timestampMs: letterIndex * 1000 }))
    .filter(({ letterIndex }) => letters[letterIndex] === "A");
  return scoreVigilance(letters, taps);
}

function completeSerial7(): MocaSerial7Capture {
  return scoreSerial7(["92", "86", "79", "72", "65"]);
}

function completeLanguage(): MocaLanguageCapture {
  return {
    sentence1: {
      transcript: "I only know that John is the one to help today",
      expected: "I only know that John is the one to help today",
      correct: true,
      missingWords: [],
      extraWords: [],
    },
    sentence2: {
      transcript: "The cat always hid under the couch when dogs were in the room",
      expected: "The cat always hid under the couch when dogs were in the room",
      correct: true,
      missingWords: [],
      extraWords: [],
    },
    score: 2,
    completedAt: Date.now(),
  };
}

function completeVerbalFluency(): MocaVerbalFluencyCapture {
  return {
    transcript: "fun fair fish fly food",
    validWords: [],
    rejectedWords: [],
    validCount: 11,
    score: 1,
    durationMs: 60_000,
    completedAt: Date.now(),
  };
}

function completeAbstraction(): MocaAbstractionCapture {
  return scoreAbstraction(["transportation", "measuring instruments"]);
}

function completeRunnerState(overrides: Partial<MocaRunnerState> = {}): MocaRunnerState {
  return {
    trailSequence: [...MOCA_TRAIL_SEQUENCE],
    cubeStrokes: [STROKE],
    clockStrokes: [STROKE],
    namingCapture: scoreNaming("lion rhinoceros dromedary"),
    memoryCapture: completeMemoryCapture(),
    digitSpanCapture: completeDigitSpan(),
    vigilanceCapture: completeVigilance(),
    serial7Capture: completeSerial7(),
    languageCapture: completeLanguage(),
    verbalFluencyCapture: completeVerbalFluency(),
    abstractionCapture: completeAbstraction(),
    ...overrides,
  };
}

describe("moca naming scoring", () => {
  it("accepts rhino and rhinoceros synonyms", () => {
    expect(scoreNaming("lion rhino camel").score).toBe(3);
    expect(scoreNaming("lion rhinoceros camel").detectedAnimals).toContain("rhino");
  });

  it("accepts camel and dromedary synonyms", () => {
    expect(scoreNaming("lion rhino dromedary").detectedAnimals).toContain("camel");
  });
});

describe("moca digit span", () => {
  it("normalizes spoken forward digits to 21854", () => {
    expect(normalizeSpokenDigits("two one eight five four")).toBe("21854");
    expect(scoreDigitSpanForward("two one eight five four").score).toBe(1);
  });

  it("scores backward 247", () => {
    const forward = { ...emptyDigitSpanCapture(), forward: scoreDigitSpanForward("21854") };
    const scored = applyDigitSpanBackward(forward, "two four seven");
    expect(scored.backward?.normalized).toBe("247");
    expect(scored.backward?.score).toBe(1);
  });

  it("skips backward when patient repeats digits in forward order (742)", () => {
    const forward = { ...emptyDigitSpanCapture(), forward: scoreDigitSpanForward("21854") };
    const skipped = applyDigitSpanBackward(forward, "seven four two");
    expect(skipped.backwardSkipped).toBe(true);
    expect(skipped.backward).toBeNull();
  });
});

describe("moca serial7 scoring", () => {
  it("scores independent subtractions after an initial wrong answer", () => {
    const result = scoreSerial7(["92", "86", "79", "72", "65"]);
    expect(result.correctCount).toBe(4);
    expect(result.score).toBe(3);
  });
});

describe("moca vigilance scoring", () => {
  it("awards 1 point when error count is at most 1", () => {
    const perfect = scoreVigilance(
      "FBACMNAAJKLBAFAKDEAAAMNAA".split(""),
      "FBACMNAAJKLBAFAKDEAAAMNAA"
        .split("")
        .map((letter, letterIndex) => ({ letterIndex, timestampMs: letterIndex * 1000 }))
        .filter(({ letterIndex }) => "FBACMNAAJKLBAFAKDEAAAMNAA"[letterIndex] === "A"),
    );
    expect(perfect.errorCount).toBe(0);
    expect(perfect.score).toBe(1);
  });
});

describe("moca abstraction scoring", () => {
  it("rejects concrete answers like wheels", () => {
    const result = scoreAbstraction(["wheels", "numbers"]);
    expect(result.score).toBe(0);
  });

  it("accepts category phrases", () => {
    const result = scoreAbstraction(["transportation", "measuring instruments"]);
    expect(result.score).toBe(2);
  });
});

describe("computeMocaTotalScore", () => {
  it("sums scored sections and clamps to max 21", () => {
    const state = completeRunnerState();
    const raw = computeMocaTotalScore(state);
    expect(raw).toBeGreaterThan(0);
    expect(clampAutomatedMocaScore(raw)).toBeLessThanOrEqual(21);
  });

  it("caps scores above max_automated_score at 21", () => {
    expect(clampAutomatedMocaScore(25)).toBe(21);
    expect(clampAutomatedMocaScore(-3)).toBe(0);
  });
});

describe("validateMocaRunnerState", () => {
  it("throws when trail is incomplete", () => {
    expect(() =>
      validateMocaRunnerState(
        completeRunnerState({ trailSequence: ["1", "A"] }),
      ),
    ).toThrow(MocaSubmitValidationError);
  });

  it("passes for a fully captured state", () => {
    expect(() => validateMocaRunnerState(completeRunnerState())).not.toThrow();
  });
});

describe("buildMocaSubmitPayload", () => {
  it("includes total_score and omits cube/clock score keys", () => {
    const payload = buildMocaSubmitPayload(completeRunnerState());
    expect(payload.total_score).toBeTypeOf("number");
    expect(payload.max_automated_score).toBe(21);
    expect(payload.visuospatial_cube).toEqual({ strokes: [STROKE] });
    expect(payload.visuospatial_clock.strokes).toEqual([STROKE]);
    expect("score" in payload.visuospatial_cube).toBe(false);
    expect("score" in payload.visuospatial_clock).toBe(false);
  });
});

export const MOCA_FORM_ID = "moca_v1" as const;

/**
 * Flip to `true` for device testing: MoCA lists on the Weekly tab, always pending.
 * Production: `false` — MoCA only appears inside the Long Assessment bundle (days 30/60/90).
 */
export const MOCA_STANDALONE_TESTING_ENABLED = false;

export function isMocaStandaloneTestingEnabled(): boolean {
  return MOCA_STANDALONE_TESTING_ENABLED;
}

/** Standalone testing route (not `/forms/moca_v1`). */
export const MOCA_STANDALONE_ROUTE = "/forms/moca" as const;

export const MOCA_FORM = {
  id: MOCA_FORM_ID,
  name: "MoCA assessment",
  description: isMocaStandaloneTestingEnabled()
    ? "Full MoCA — all 13 sections, always available for device testing (temporary)."
    : "Montreal Cognitive Assessment — cognitive screening as part of your Long Assessment.",
} as const;

/** Maximum MoCA score computed on-device (excludes cube, clock, orientation, education bonus). */
export const MOCA_MAX_AUTOMATED_SCORE = 21;

/** Forward digit span — examiner reads one digit per second. */
export const MOCA_DIGIT_SPAN_FORWARD_READ = ["2", "1", "8", "5", "4"] as const;
export const MOCA_DIGIT_SPAN_FORWARD_CORRECT = "21854";

/** Backward digit span — read 7-4-2; correct response is 2-4-7. */
export const MOCA_DIGIT_SPAN_BACKWARD_READ = ["7", "4", "2"] as const;
export const MOCA_DIGIT_SPAN_BACKWARD_CORRECT = "247";
/** Forward-order repeat on backward trial → backward not administered. */
export const MOCA_DIGIT_SPAN_BACKWARD_READ_FORWARD_ORDER = "742";

export type MocaDigitSpanTrialCapture = {
  readSequence: readonly string[];
  expected: string;
  transcript: string;
  normalized: string;
  correct: boolean;
  score: 0 | 1;
  completedAt: number | null;
};

export type MocaDigitSpanCapture = {
  forward: MocaDigitSpanTrialCapture;
  backward: MocaDigitSpanTrialCapture | null;
  backwardAdministered: boolean;
  /** True when backward trial was skipped (patient repeated forward order). */
  backwardSkipped: boolean;
};

/** MoCA trail-making nodes in required tap order. */
export const MOCA_TRAIL_SEQUENCE = [
  "1",
  "A",
  "2",
  "B",
  "3",
  "C",
  "4",
  "D",
  "5",
  "E",
] as const;

export type MocaTrailNodeId = (typeof MOCA_TRAIL_SEQUENCE)[number];

export type MocaTrailNode = {
  id: MocaTrailNodeId;
  /** Normalized position within the canvas (0–1). */
  x: number;
  y: number;
};

/** Layout approximating the MoCA visuospatial / executive trail-making paper. */
export const MOCA_TRAIL_NODES: readonly MocaTrailNode[] = [
  { id: "1", x: 0.14, y: 0.16 },
  { id: "A", x: 0.52, y: 0.14 },
  { id: "2", x: 0.68, y: 0.34 },
  { id: "B", x: 0.9, y: 0.42 },
  { id: "3", x: 0.86, y: 0.78 },
  { id: "C", x: 0.54, y: 0.68 },
  { id: "4", x: 0.2, y: 0.4 },
  { id: "D", x: 0.08, y: 0.46 },
  { id: "5", x: 0.12, y: 0.82 },
  { id: "E", x: 0.46, y: 0.86 },
];

/** Canonical MoCA scoring order (compare against saved tap sequence later). */
export const MOCA_TRAIL_CORRECT_SEQUENCE = MOCA_TRAIL_SEQUENCE;

/** Normalized freehand stroke for drawing tasks (0–1 within canvas bounds). */
export type MocaDrawingStroke = {
  points: Array<{ x: number; y: number }>;
};

/** MoCA clock draw target time (standard form wording). */
export const MOCA_CLOCK_TIME_PROMPT = "ten past eleven" as const;

/** MoCA memory word list (learning trials + delayed recall). */
export const MOCA_MEMORY_WORDS = ["face", "velvet", "church", "daisy", "red"] as const;

export type MocaMemoryWord = (typeof MOCA_MEMORY_WORDS)[number];

/** Standard MoCA interval before delayed recall (5 minutes). */
export const MOCA_MEMORY_RECALL_DELAY_MS = 5 * 60 * 1000;

/** Pacing for memory TTS — pauses give time to concentrate between instructions. */
export const MOCA_MEMORY_PACING = {
  speechRate: 0.76,
  pauseShortMs: 1800,
  pauseMediumMs: 2800,
  pauseLongMs: 4200,
  pauseBeforeRepeatMs: 4000,
} as const;

export type MocaMemoryTrialCapture = {
  transcript: string;
  detectedWords: MocaMemoryWord[];
};

/** Future submit payload for memory learning + delayed recall. */
export type MocaMemoryCapture = {
  trial1: MocaMemoryTrialCapture;
  trial2: MocaMemoryTrialCapture;
  delayedRecall: MocaMemoryTrialCapture;
  /** Unix ms when delayed recall becomes available (set after 2nd trial). */
  recallAvailableAt: number | null;
};

/** Standard MoCA vigilance letter list (read at one letter per second). */
export const MOCA_VIGILANCE_LETTERS = [
  "F",
  "B",
  "A",
  "C",
  "M",
  "N",
  "A",
  "A",
  "J",
  "K",
  "L",
  "B",
  "A",
  "F",
  "A",
  "K",
  "D",
  "E",
  "A",
  "A",
  "A",
  "J",
  "A",
  "M",
  "O",
  "F",
  "A",
  "A",
  "B",
] as const;

export type MocaVigilanceLetter = (typeof MOCA_VIGILANCE_LETTERS)[number];

/** Gap between vigilance letters (MoCA paper uses ~1/sec; slightly longer for clearer pacing). */
export const MOCA_VIGILANCE_LETTER_INTERVAL_MS = 1800;

export type MocaVigilanceTap = {
  letterIndex: number;
  timestampMs: number;
};

export type MocaVigilanceLetterResult = {
  index: number;
  letter: string;
  isTarget: boolean;
  tapped: boolean;
  error: "none" | "omission" | "commission";
};

/** Future submit payload for vigilance taps + scoring. */
export type MocaVigilanceCapture = {
  taps: MocaVigilanceTap[];
  letterResults: MocaVigilanceLetterResult[];
  errorCount: number;
  score: 0 | 1;
  completedAt: number | null;
};

/** Serial 7 subtraction — start at 100, subtract 7 five times. */
export const MOCA_SERIAL7_START = 100;
export const MOCA_SERIAL7_STEP = 7;
export const MOCA_SERIAL7_SUBTRACTION_COUNT = 5;

export const MOCA_SERIAL7_CORRECT_ANSWERS = [93, 86, 79, 72, 65] as const;

export type MocaSerial7SubtractionResult = {
  index: number;
  answer: string;
  parsed: number | null;
  expected: number;
  correct: boolean;
};

/** Future submit payload for serial 7 answers + scoring. */
export type MocaSerial7Capture = {
  answers: string[];
  results: MocaSerial7SubtractionResult[];
  correctCount: number;
  score: 0 | 1 | 2 | 3;
  completedAt: number | null;
};

/** MoCA sentence repetition (language) — must be repeated exactly. */
export const MOCA_LANGUAGE_SENTENCES = [
  "I only know that John is the one to help today.",
  "The cat always hid under the couch when dogs were in the room.",
] as const;

export type MocaLanguageSentenceIndex = 0 | 1;

export type MocaLanguageSentenceCapture = {
  transcript: string;
  expected: string;
  correct: boolean;
  missingWords: string[];
  extraWords: string[];
};

/** Future submit payload for sentence repetition. */
export type MocaLanguageCapture = {
  sentence1: MocaLanguageSentenceCapture;
  sentence2: MocaLanguageSentenceCapture;
  score: 0 | 1 | 2;
  completedAt: number | null;
};

/** MoCA verbal fluency — words beginning with F for up to one minute. */
export const MOCA_VERBAL_FLUENCY_LETTER = "F";
export const MOCA_VERBAL_FLUENCY_DURATION_MS = 60 * 1000;
/** Standard MoCA threshold for the verbal fluency point. */
export const MOCA_VERBAL_FLUENCY_PASS_COUNT = 11;

export type MocaVerbalFluencyWord = {
  word: string;
  stem: string;
};

export type MocaVerbalFluencyRejectedWord = {
  token: string;
  reason: "not_f_letter" | "number" | "proper_noun" | "duplicate" | "verb_form";
};

/** Future submit payload for verbal fluency. */
export type MocaVerbalFluencyCapture = {
  transcript: string;
  validWords: MocaVerbalFluencyWord[];
  rejectedWords: MocaVerbalFluencyRejectedWord[];
  validCount: number;
  score: 0 | 1;
  durationMs: number;
  completedAt: number | null;
};

/** MoCA abstraction example (not scored). */
export const MOCA_ABSTRACTION_EXAMPLE = {
  left: "Banana",
  right: "Orange",
  sampleAnswer: "Fruit",
} as const;

/** MoCA abstraction pairs — keyword hints support automated prototype scoring. */
export const MOCA_ABSTRACTION_PAIRS = [
  {
    id: "transport",
    left: "Train",
    right: "Bicycle",
    keywords: [
      "transport",
      "travel",
      "travell",
      "vehicle",
      "ride",
      "commut",
      "get around",
      "trip",
    ],
    rejectKeywords: ["wheel"],
  },
  {
    id: "measure",
    left: "Watch",
    right: "Ruler",
    keywords: ["measur", "measurement", "instrument"],
    rejectKeywords: ["number"],
  },
] as const;

export type MocaAbstractionPairId = (typeof MOCA_ABSTRACTION_PAIRS)[number]["id"];

export type MocaAbstractionPairResult = {
  pairId: MocaAbstractionPairId;
  left: string;
  right: string;
  answer: string;
  correct: boolean;
};

/** Future submit payload for abstraction similarities. */
export type MocaAbstractionCapture = {
  answers: string[];
  results: MocaAbstractionPairResult[];
  correctCount: number;
  score: 0 | 1 | 2;
  completedAt: number | null;
};

/** Ordered MoCA sections for paginated runner (one task per page). */
export const MOCA_SECTION_IDS = [
  "trail",
  "cube",
  "clock",
  "naming",
  "memory",
  "digit_span_forward",
  "digit_span_backward",
  "vigilance",
  "serial7",
  "language",
  "verbal_fluency",
  "abstraction",
  "delayed_recall",
] as const;

export type MocaSectionId = (typeof MOCA_SECTION_IDS)[number];

export const MOCA_SECTIONS: readonly { id: MocaSectionId; title: string }[] = [
  { id: "trail", title: "Trail making" },
  { id: "cube", title: "Cube copy" },
  { id: "clock", title: "Clock draw" },
  { id: "naming", title: "Naming" },
  { id: "memory", title: "Memory" },
  { id: "digit_span_forward", title: "Digit span (forward)" },
  { id: "digit_span_backward", title: "Digit span (backward)" },
  { id: "vigilance", title: "Vigilance" },
  { id: "serial7", title: "Serial 7s" },
  { id: "language", title: "Language" },
  { id: "verbal_fluency", title: "Verbal fluency" },
  { id: "abstraction", title: "Abstraction" },
  { id: "delayed_recall", title: "Delayed recall" },
];

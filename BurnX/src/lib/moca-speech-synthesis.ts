import * as Speech from "expo-speech";

import {
  MOCA_LANGUAGE_SENTENCES,
  MOCA_MEMORY_PACING,
  MOCA_MEMORY_WORDS,
  MOCA_VIGILANCE_LETTER_INTERVAL_MS,
  MOCA_VIGILANCE_LETTERS,
} from "../constants/forms/moca";

export type MocaSpeechHandlers = {
  onDone?: () => void;
  onError?: (message: string) => void;
  /** Called before each speak/pause step so the UI can show matching guidance. */
  onCue?: (cue: string) => void;
};

type ScriptStep =
  | { type: "speak"; text: string; cue?: string }
  | { type: "pause"; ms: number; cue?: string };

let activeScriptGen = 0;

function delay(ms: number, gen: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (gen === activeScriptGen) resolve();
    }, ms);
    // If cancelled mid-wait, the next script bump still resolves eventually — harmless.
    void timer;
  });
}

function speakOnce(text: string, rate: number = MOCA_MEMORY_PACING.speechRate): Promise<void> {
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (error) => {
        reject(new Error(error.message || "Text-to-speech failed."));
      },
    });
  });
}

/** Speak text aloud (single phrase). */
export function speakMocaText(text: string, handlers: MocaSpeechHandlers = {}): void {
  handlers.onCue?.(text);
  void speakOnce(text).then(
    () => handlers.onDone?.(),
    (error) => handlers.onError?.(error.message),
  );
}

export function stopMocaSpeech(): void {
  activeScriptGen += 1;
  Speech.stop();
}

export function isMocaSpeakingAsync(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

async function runScript(steps: ScriptStep[], handlers: MocaSpeechHandlers): Promise<void> {
  const gen = activeScriptGen + 1;
  activeScriptGen = gen;

  try {
    for (const step of steps) {
      if (gen !== activeScriptGen) return;

      if (step.cue) handlers.onCue?.(step.cue);

      if (step.type === "pause") {
        await delay(step.ms, gen);
        continue;
      }

      await speakOnce(step.text);
    }

    if (gen === activeScriptGen) handlers.onDone?.();
  } catch (error) {
    if (gen === activeScriptGen) {
      handlers.onError?.(error instanceof Error ? error.message : "Text-to-speech failed.");
    }
  }
}

function wordListSteps(): ScriptStep[] {
  const phrase = MOCA_MEMORY_WORDS.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1),
  ).join(". ");
  return [
    {
      type: "speak",
      text: `${phrase}.`,
      cue: "Listen to the five words…",
    },
  ];
}

const { pauseLongMs, pauseMediumMs } = MOCA_MEMORY_PACING;

/** Full first learning trial: MoCA instructions, word list, then recording phase. */
export function runMemoryTrial1Script(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text:
          "This is a memory test. I am going to read a list of words that you will have to remember now and later on. Listen carefully. When I am through, tell me as many words as you can remember. It doesn't matter in what order you say them.",
        cue: "Memory test — listen carefully.",
      },
      { type: "pause", ms: pauseMediumMs, cue: "Get ready…" },
      ...wordListSteps(),
    ],
    handlers,
  );
}

/** Second learning trial — same list with MoCA second-trial instructions. */
export function runMemoryTrial2Script(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text:
          "I am going to read the same list for a second time. Try to remember and tell me as many words as you can, including words you said the first time.",
        cue: "Second reading — listen carefully.",
      },
      { type: "pause", ms: pauseMediumMs, cue: "Get ready…" },
      ...wordListSteps(),
    ],
    handlers,
  );
}

/** Delayed recall — instructions only, no word list. */
export function runMemoryRecallScript(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text: "It has been a few minutes since you heard the word list.",
        cue: "Delayed recall — listen.",
      },
      {
        type: "speak",
        text: "The words will not be read again. Try to remember them.",
        cue: "The list is not repeated.",
      },
      { type: "pause", ms: pauseLongMs, cue: "Think carefully…" },
      {
        type: "speak",
        text: "Now tell me as many of the five words as you can remember.",
        cue: "Your turn — tap Start recording.",
      },
    ],
    handlers,
  );
}

/** First MoCA sentence repetition trial. */
export function runLanguageSentence1Script(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text: "I am going to read you a sentence. Repeat it after me, exactly as I say it.",
        cue: "Sentence 1 — listen carefully.",
      },
      { type: "pause", ms: pauseMediumMs, cue: "Get ready…" },
      {
        type: "speak",
        text: MOCA_LANGUAGE_SENTENCES[0],
        cue: "Repeat the sentence aloud.",
      },
    ],
    handlers,
  );
}

/** Second MoCA sentence repetition trial. */
export function runLanguageSentence2Script(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text: "Now I am going to read you another sentence. Repeat it after me, exactly as I say it.",
        cue: "Sentence 2 — listen carefully.",
      },
      { type: "pause", ms: pauseMediumMs, cue: "Get ready…" },
      {
        type: "speak",
        text: MOCA_LANGUAGE_SENTENCES[1],
        cue: "Repeat the sentence aloud.",
      },
    ],
    handlers,
  );
}

const MOCA_VERBAL_FLUENCY_INSTRUCTIONS =
  "Now, I want you to tell me as many words as you can think of that begin with the letter F. I will tell you to stop after one minute. Proper nouns, numbers, and different forms of a verb are not permitted. Are you ready?";

/** Verbal fluency — read instructions, then the patient speaks for up to one minute. */
export function runVerbalFluencyScript(handlers: MocaSpeechHandlers = {}): void {
  void runScript(
    [
      {
        type: "speak",
        text: MOCA_VERBAL_FLUENCY_INSTRUCTIONS,
        cue: "Listen to the instructions.",
      },
    ],
    handlers,
  );
}

export type MocaVigilanceSpeechHandlers = MocaSpeechHandlers & {
  onLetterStart?: (index: number, letter: string) => void;
  onLetterEnd?: (index: number, letter: string) => void;
};

function vigilanceLetterSpoken(letter: string): string {
  return letter.toLowerCase();
}

const MOCA_VIGILANCE_INSTRUCTIONS =
  "I am going to read a sequence of letters. Every time you hear a, please tap in the box. If you hear a different letter, do not tap in the box.";

/** Vigilance task: spoken instructions, one "Get ready", then letters at a fixed interval. */
export function runVigilanceScript(handlers: MocaVigilanceSpeechHandlers = {}): void {
  void runVigilanceSequence(handlers);
}

async function runVigilanceSequence(handlers: MocaVigilanceSpeechHandlers): Promise<void> {
  const gen = activeScriptGen + 1;
  activeScriptGen = gen;

  try {
    handlers.onCue?.("Instructions are being read aloud.");
    await speakOnce(MOCA_VIGILANCE_INSTRUCTIONS, 0.85);
    if (gen !== activeScriptGen) return;

    handlers.onCue?.("Tap in the box when you hear a.");
    await delay(600, gen);
    if (gen !== activeScriptGen) return;

    handlers.onCue?.("Get ready…");
    await speakOnce("Get ready.", 0.85);
    if (gen !== activeScriptGen) return;

    for (let index = 0; index < MOCA_VIGILANCE_LETTERS.length; index += 1) {
      if (gen !== activeScriptGen) return;

      const letter = MOCA_VIGILANCE_LETTERS[index]!;
      const spoken = vigilanceLetterSpoken(letter);

      handlers.onLetterStart?.(index, letter);

      const slotStart = Date.now();
      await speakOnce(spoken, 0.82);
      if (gen !== activeScriptGen) return;

      const elapsed = Date.now() - slotStart;
      const remain = Math.max(400, MOCA_VIGILANCE_LETTER_INTERVAL_MS - elapsed);
      await delay(remain, gen);
      if (gen !== activeScriptGen) return;

      handlers.onLetterEnd?.(index, letter);
    }

    if (gen === activeScriptGen) handlers.onDone?.();
  } catch (error) {
    if (gen === activeScriptGen) {
      handlers.onError?.(error instanceof Error ? error.message : "Text-to-speech failed.");
    }
  }
}

const DIGIT_SPAN_PACE_MS = 1000;

async function speakDigitSequence(digits: readonly string[], gen: number): Promise<void> {
  for (const digit of digits) {
    if (gen !== activeScriptGen) return;
    await speakOnce(digit, 0.82);
    if (gen !== activeScriptGen) return;
    await delay(DIGIT_SPAN_PACE_MS, gen);
  }
}

/** Forward digit span: instructions then 2-1-8-5-4 at one digit per second. */
export function runForwardDigitSpanScript(handlers: MocaSpeechHandlers = {}): void {
  void runForwardDigitSpanSequence(handlers);
}

async function runForwardDigitSpanSequence(handlers: MocaSpeechHandlers): Promise<void> {
  const gen = activeScriptGen + 1;
  activeScriptGen = gen;

  try {
    handlers.onCue?.("Listen to the numbers.");
    await speakOnce(
      "I am going to say some numbers. When I am through, repeat them to me exactly as I said them.",
      0.85,
    );
    if (gen !== activeScriptGen) return;
    await delay(MOCA_MEMORY_PACING.pauseMediumMs, gen);
    if (gen !== activeScriptGen) return;

    await speakDigitSequence(["2", "1", "8", "5", "4"], gen);
    if (gen === activeScriptGen) handlers.onDone?.();
  } catch (error) {
    if (gen === activeScriptGen) {
      handlers.onError?.(error instanceof Error ? error.message : "Text-to-speech failed.");
    }
  }
}

/** Backward digit span: instructions then 7-4-2 at one digit per second. */
export function runBackwardDigitSpanScript(handlers: MocaSpeechHandlers = {}): void {
  void runBackwardDigitSpanSequence(handlers);
}

async function runBackwardDigitSpanSequence(handlers: MocaSpeechHandlers): Promise<void> {
  const gen = activeScriptGen + 1;
  activeScriptGen = gen;

  try {
    handlers.onCue?.("Listen to the numbers.");
    await speakOnce(
      "Now I am going to say some more numbers, but when I am through you must repeat them to me in the backward order.",
      0.85,
    );
    if (gen !== activeScriptGen) return;
    await delay(MOCA_MEMORY_PACING.pauseMediumMs, gen);
    if (gen !== activeScriptGen) return;

    await speakDigitSequence(["7", "4", "2"], gen);
    if (gen === activeScriptGen) handlers.onDone?.();
  } catch (error) {
    if (gen === activeScriptGen) {
      handlers.onError?.(error instanceof Error ? error.message : "Text-to-speech failed.");
    }
  }
}

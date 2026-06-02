import {
  MOCA_LANGUAGE_SENTENCES,
  type MocaLanguageCapture,
  type MocaLanguageSentenceCapture,
} from "../constants/forms/moca";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function emptySentenceCapture(expected: string): MocaLanguageSentenceCapture {
  return {
    transcript: "",
    expected,
    correct: false,
    missingWords: [],
    extraWords: [],
  };
}

export function emptyLanguageCapture(): MocaLanguageCapture {
  return {
    sentence1: emptySentenceCapture(MOCA_LANGUAGE_SENTENCES[0]),
    sentence2: emptySentenceCapture(MOCA_LANGUAGE_SENTENCES[1]),
    score: 0,
    completedAt: null,
  };
}

export function scoreLanguageSentence(
  transcript: string,
  expected: string,
): MocaLanguageSentenceCapture {
  const expectedWords = tokenize(expected);
  const spokenWords = tokenize(transcript);
  const correct = expectedWords.join(" ") === spokenWords.join(" ");

  const spokenCounts = new Map<string, number>();
  for (const word of spokenWords) {
    spokenCounts.set(word, (spokenCounts.get(word) ?? 0) + 1);
  }

  const missingWords: string[] = [];
  for (const word of expectedWords) {
    const remain = spokenCounts.get(word) ?? 0;
    if (remain <= 0) missingWords.push(word);
    else spokenCounts.set(word, remain - 1);
  }

  const extraWords = [...spokenCounts.entries()]
    .flatMap(([word, count]) => Array.from({ length: count }, () => word));

  return {
    transcript: transcript.trim(),
    expected,
    correct,
    missingWords,
    extraWords,
  };
}

export function finalizeLanguageCapture(
  sentence1: MocaLanguageSentenceCapture,
  sentence2: MocaLanguageSentenceCapture,
): MocaLanguageCapture {
  const score = (sentence1.correct ? 1 : 0) + (sentence2.correct ? 1 : 0);
  return {
    sentence1,
    sentence2,
    score: score as 0 | 1 | 2,
    completedAt: Date.now(),
  };
}

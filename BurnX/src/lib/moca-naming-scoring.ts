import type { MocaNamingAnimal } from "./moca-naming-detection";
import { detectNamedAnimals } from "./moca-naming-detection";

export function scoreNaming(
  transcript: string,
  completedAt: number | null = null,
): {
  transcript: string;
  detectedAnimals: MocaNamingAnimal[];
  score: 0 | 1 | 2 | 3;
  completedAt: number | null;
} {
  const trimmed = transcript.trim();
  const detectedAnimals = detectNamedAnimals(trimmed);
  const unique = [...new Set(detectedAnimals)];
  const score = Math.min(3, unique.length) as 0 | 1 | 2 | 3;
  return { transcript: trimmed, detectedAnimals: unique, score, completedAt };
}

export function completeNamingCapture(
  capture: Omit<ReturnType<typeof scoreNaming>, "completedAt"> & {
    completedAt?: number | null;
  },
): ReturnType<typeof scoreNaming> {
  return { ...capture, completedAt: Date.now() };
}

export function emptyNamingCapture() {
  return scoreNaming("");
}

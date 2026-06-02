import type { FormDefinition } from "../constants/forms";

const cache = new Map<string, FormDefinition[]>();

function cacheKey(formIds: readonly string[]): string {
  return formIds.join("\0");
}

export function getAssignmentsListCache(
  formIds: readonly string[],
): FormDefinition[] | undefined {
  return cache.get(cacheKey(formIds));
}

export function setAssignmentsListCache(
  formIds: readonly string[],
  pending: FormDefinition[],
): void {
  cache.set(cacheKey(formIds), pending);
}

let voicePendingCache: boolean | undefined;

export function getVoicePendingCache(): boolean | undefined {
  return voicePendingCache;
}

export function setVoicePendingCache(pending: boolean): void {
  voicePendingCache = pending;
}

export function clearAssignmentsListCache(): void {
  cache.clear();
  voicePendingCache = undefined;
}

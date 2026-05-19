import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { bxLog } from "./debug-log";

/**
 * iOS/Android SecureStore (Keychain) only allows `[A-Za-z0-9._-]` — no `:` `@` `/`, etc.
 * Web `localStorage` is unrestricted; we still validate on native only.
 */
const NATIVE_STORAGE_KEY_RE = /^[A-Za-z0-9._-]+$/;

export function isValidNativeStorageKey(key: string): boolean {
  return key.length > 0 && NATIVE_STORAGE_KEY_RE.test(key);
}

function assertNativeStorageKey(key: string, op: string): void {
  if (Platform.OS === "web") return;
  if (!isValidNativeStorageKey(key)) {
    throw new Error(
      `${op}: invalid SecureStore key (allowed: letters, digits, ".", "-", "_"): ${JSON.stringify(key)}`,
    );
  }
}

export async function getStorageItem(key: string) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  assertNativeStorageKey(key, "getStorageItem");
  return SecureStore.getItemAsync(key);
}

export async function setStorageItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  assertNativeStorageKey(key, "setStorageItem");
  await SecureStore.setItemAsync(key, value);
}

/**
 * Deletes a native key. Invalid keys are skipped (logged). Other SecureStore errors are caught
 * so **sign-out and cache clears never abort** the rest of the flow on iOS/Android.
 */
export async function deleteStorageItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  if (!isValidNativeStorageKey(key)) {
    bxLog("storage", "deleteStorageItem skipped: invalid SecureStore key", key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    bxLog("storage", "deleteStorageItem failed (non-fatal)", key, e);
  }
}

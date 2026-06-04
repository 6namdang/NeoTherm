/**
 * Dashboard data caching with submit-based invalidation.
 *
 * Strategy: Stale-While-Revalidate
 * - On app open: show cached data immediately, fetch fresh in background
 * - On form submit: clear the dashboard cache so the next load refetches
 * - Errors are never hidden - cache failures are logged but don't block UI
 *
 * The dashboard is fetched as a single combined payload (LIBRE, PSQI, fatigue,
 * pain, GAD-7, cognitive, EMA rows, care-program rows) in one pass, so it is
 * cached under a single key. Any form submission that could change dashboard
 * content invalidates that one key, guaranteeing the next load is fresh.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { isEmaFormId } from "../constants/ema-forms";
import { bxLog } from "./debug-log";

const CACHE_PREFIX = "dashboard.cache.";
const CACHE_VERSION = "v1";

/**
 * Cache sections. Currently the whole dashboard is fetched together and stored
 * under `"dashboard"`. This enum keeps room for future per-section caches.
 */
export type DashboardCacheKey = "dashboard";

const ALL_CACHE_KEYS: DashboardCacheKey[] = ["dashboard"];

/** Form IDs whose submission changes data shown on the dashboard. */
const DASHBOARD_FORM_IDS = new Set<string>([
  "libre_v1",
  "psqi_v1",
  "fatigue_v1",
  "pain_intensity_v1",
  "gad7_v1",
  "cognitive_function_v1",
]);

type CacheEntry<T> = {
  version: string;
  cachedAt: string;
  data: T;
};

function buildStorageKey(key: DashboardCacheKey): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Read cached data for a dashboard section.
 * Returns null if cache is missing, version-mismatched, or corrupted.
 * Never throws - errors are logged but returned as null.
 */
export async function getDashboardCache<T>(
  key: DashboardCacheKey,
): Promise<{ data: T; cachedAt: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(buildStorageKey(key));
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<T>;

    if (entry.version !== CACHE_VERSION) {
      bxLog("cache", `Cache version mismatch for ${key}, ignoring`);
      return null;
    }

    return { data: entry.data, cachedAt: entry.cachedAt };
  } catch (err) {
    bxLog("cache", `Failed to read cache for ${key}`, err);
    return null;
  }
}

/**
 * Store data in the cache for a dashboard section.
 * Never throws - errors are logged but don't interrupt the flow.
 */
export async function setDashboardCache<T>(
  key: DashboardCacheKey,
  data: T,
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      version: CACHE_VERSION,
      cachedAt: new Date().toISOString(),
      data,
    };
    await AsyncStorage.setItem(buildStorageKey(key), JSON.stringify(entry));
    bxLog("cache", `Cached ${key}`);
  } catch (err) {
    bxLog("cache", `Failed to write cache for ${key}`, err);
  }
}

/**
 * Clear cache for a dashboard section.
 * Never throws - errors are logged but don't interrupt the flow.
 */
export async function clearDashboardCache(
  key: DashboardCacheKey,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(buildStorageKey(key));
    bxLog("cache", `Cleared cache for ${key}`);
  } catch (err) {
    bxLog("cache", `Failed to clear cache for ${key}`, err);
  }
}

/**
 * Clear all dashboard caches. Use on sign-out or account deletion.
 */
export async function clearAllDashboardCaches(): Promise<void> {
  try {
    const storageKeys = ALL_CACHE_KEYS.map(buildStorageKey);
    await AsyncStorage.multiRemove(storageKeys);
    bxLog("cache", "Cleared all dashboard caches");
  } catch (err) {
    bxLog("cache", "Failed to clear all dashboard caches", err);
  }
}

/**
 * Returns true when submitting this form could change dashboard content
 * (scored questionnaires + any EMA form, which affects pending rows).
 */
export function formAffectsDashboard(formId: string): boolean {
  return DASHBOARD_FORM_IDS.has(formId) || isEmaFormId(formId);
}

/**
 * Invalidate the dashboard cache after a form submission.
 * Called from the form submission success handler.
 */
export async function invalidateCacheForForm(formId: string): Promise<void> {
  if (!formAffectsDashboard(formId)) return;
  await clearDashboardCache("dashboard");
}

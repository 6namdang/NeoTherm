import { deleteStorageItem, getStorageItem, setStorageItem } from "./storage";
import type {
  HomeAwayDailySummary,
  HomeAwaySnapshot,
  HomeAwayTrackerState,
  HomeLocationConfig,
} from "./home-location-types";

const CONFIG_KEY = "homeLocationConfig";
const TRACKER_KEY = "homeLocationTracker";
const SUMMARIES_KEY = "homeLocationSummaries";
const MAX_LOCAL_SUMMARY_DAYS = 30;

const DEFAULT_TRACKER: HomeAwayTrackerState = {
  currentState: "unknown",
  lastTransitionAt: null,
  lastUpdatedAt: null,
};

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getHomeLocationConfig(): Promise<HomeLocationConfig | null> {
  return readJson<HomeLocationConfig | null>(
    await getStorageItem(CONFIG_KEY),
    null,
  );
}

export async function setHomeLocationConfig(
  config: HomeLocationConfig,
): Promise<void> {
  await setStorageItem(CONFIG_KEY, JSON.stringify(config));
}

export async function updateHomeLocationConfig(
  patch: Partial<HomeLocationConfig>,
): Promise<HomeLocationConfig | null> {
  const current = await getHomeLocationConfig();
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await setHomeLocationConfig(next);
  return next;
}

export async function getHomeAwayTrackerState(): Promise<HomeAwayTrackerState> {
  return readJson<HomeAwayTrackerState>(
    await getStorageItem(TRACKER_KEY),
    DEFAULT_TRACKER,
  );
}

export async function setHomeAwayTrackerState(
  tracker: HomeAwayTrackerState,
): Promise<void> {
  await setStorageItem(TRACKER_KEY, JSON.stringify(tracker));
}

export async function getHomeAwaySummaries(): Promise<HomeAwayDailySummary[]> {
  const parsed = readJson<HomeAwayDailySummary[]>(
    await getStorageItem(SUMMARIES_KEY),
    [],
  );
  return Array.isArray(parsed)
    ? parsed.map((summary) => ({
        date: summary.date,
        homeMinutes: summary.homeMinutes,
        outsideMinutes: summary.outsideMinutes,
        lastUpdatedAt: summary.lastUpdatedAt,
      }))
    : [];
}

export async function setHomeAwaySummaries(
  summaries: HomeAwayDailySummary[],
): Promise<void> {
  const minimized = [...summaries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_LOCAL_SUMMARY_DAYS);
  await setStorageItem(SUMMARIES_KEY, JSON.stringify(minimized));
}

export async function getHomeAwaySnapshot(): Promise<HomeAwaySnapshot> {
  const [config, tracker, summaries] = await Promise.all([
    getHomeLocationConfig(),
    getHomeAwayTrackerState(),
    getHomeAwaySummaries(),
  ]);

  return { config, tracker, summaries };
}

export async function clearHomeAwayTrackingData(): Promise<void> {
  await Promise.all([
    deleteStorageItem(CONFIG_KEY),
    deleteStorageItem(TRACKER_KEY),
    deleteStorageItem(SUMMARIES_KEY),
  ]);
}

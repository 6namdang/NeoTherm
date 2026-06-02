import { compileSleepBlock } from "./sleep-compiler";
import { localDateKey } from "./home-location-accumulator";
import { deleteStorageItem, getStorageItem, setStorageItem } from "./storage";

export type SleepDailySummary = {
  date: string;
  sleepMinutes: number;
  lastUpdatedAt: string | null;
};

export const SLEEP_HISTORY_MAX_DAYS = 30;

const ANCHOR_KEY = "sleepAnchorTimestamp";
const SUMMARIES_KEY = "sleepDailySummaries";

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function createEmptySummary(date: string): SleepDailySummary {
  return {
    date,
    sleepMinutes: 0,
    lastUpdatedAt: null,
  };
}

export function getSummaryForDate(
  summaries: SleepDailySummary[],
  date: string,
): SleepDailySummary {
  return summaries.find((summary) => summary.date === date) ?? createEmptySummary(date);
}

export async function getSleepAnchor(): Promise<string | null> {
  const raw = await getStorageItem(ANCHOR_KEY);
  return raw && raw.length > 0 ? raw : null;
}

export async function setSleepAnchor(isoTimestamp: string): Promise<void> {
  await setStorageItem(ANCHOR_KEY, isoTimestamp);
}

export async function clearSleepAnchor(): Promise<void> {
  await deleteStorageItem(ANCHOR_KEY);
}

export async function getSleepSummaries(): Promise<SleepDailySummary[]> {
  const parsed = readJson<SleepDailySummary[]>(
    await getStorageItem(SUMMARIES_KEY),
    [],
  );
  return Array.isArray(parsed)
    ? parsed.map((summary) => ({
        date: summary.date,
        sleepMinutes: summary.sleepMinutes,
        lastUpdatedAt: summary.lastUpdatedAt,
      }))
    : [];
}

async function setSleepSummaries(summaries: SleepDailySummary[]): Promise<void> {
  const minimized = [...summaries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-SLEEP_HISTORY_MAX_DAYS);
  await setStorageItem(SUMMARIES_KEY, JSON.stringify(minimized));
}

export async function addSleepMinutesForBlock(
  anchor: Date,
  wake: Date,
): Promise<SleepDailySummary[]> {
  const existing = await getSleepSummaries();
  const compiled = compileSleepBlock(anchor, wake, existing);
  await setSleepSummaries(compiled);
  return getSleepSummaries();
}

export async function clearSleepTrackingData(): Promise<void> {
  await Promise.all([deleteStorageItem(ANCHOR_KEY), deleteStorageItem(SUMMARIES_KEY)]);
}

export async function getTodaySleepMinutes(now: Date = new Date()): Promise<number> {
  const summaries = await getSleepSummaries();
  return getSummaryForDate(summaries, localDateKey(now)).sleepMinutes;
}

export function latestSleepSummaries(
  summaries: SleepDailySummary[],
  days: number,
  now: Date = new Date(),
): SleepDailySummary[] {
  const keys = new Set<string>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.add(localDateKey(d));
  }
  return Array.from(keys).map((date) => getSummaryForDate(summaries, date));
}

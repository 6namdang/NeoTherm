import type {
  HomeAwayDailySummary,
  HomeAwayState,
  HomeAwayTransitionInput,
} from "./home-location-types";

export const HOME_AWAY_NAVIGABLE_DAYS = 30;
export const HOME_AWAY_CHART_DAYS = 7;

const MS_PER_MINUTE = 60_000;

export type HomeAwayDayHeading = {
  primary: string;
  secondary: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfNextLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function createEmptySummary(date: string): HomeAwayDailySummary {
  return {
    date,
    homeMinutes: 0,
    outsideMinutes: 0,
    lastUpdatedAt: null,
  };
}

function addMinutes(
  summary: HomeAwayDailySummary,
  state: HomeAwayState,
  minutes: number,
  updatedAt: string,
): HomeAwayDailySummary {
  if (minutes <= 0) {
    return {
      ...summary,
      lastUpdatedAt: updatedAt,
    };
  }

  if (state === "inside") {
    return {
      ...summary,
      homeMinutes: summary.homeMinutes + minutes,
      lastUpdatedAt: updatedAt,
    };
  }

  if (state === "outside") {
    return {
      ...summary,
      outsideMinutes: summary.outsideMinutes + minutes,
      lastUpdatedAt: updatedAt,
    };
  }

  return {
    ...summary,
    lastUpdatedAt: updatedAt,
  };
}

export function upsertSummary(
  summaries: HomeAwayDailySummary[],
  summary: HomeAwayDailySummary,
): HomeAwayDailySummary[] {
  const next = summaries.filter((item) => item.date !== summary.date);
  next.push(summary);
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

export function getSummaryForDate(
  summaries: HomeAwayDailySummary[],
  date: string,
): HomeAwayDailySummary {
  return summaries.find((summary) => summary.date === date) ?? createEmptySummary(date);
}

export function applyHomeAwayTransition({
  previousState,
  previousTransitionAt,
  nextState,
  observedAt,
  summaries,
}: HomeAwayTransitionInput): HomeAwayDailySummary[] {
  if (!previousTransitionAt || observedAt <= previousTransitionAt) {
    return upsertSummary(summaries, {
      ...getSummaryForDate(summaries, localDateKey(observedAt)),
      lastUpdatedAt: observedAt.toISOString(),
    });
  }

  // No prior check-in state — start counting from this event only.
  if (previousState === "unknown") {
    return upsertSummary(summaries, {
      ...getSummaryForDate(summaries, localDateKey(observedAt)),
      lastUpdatedAt: observedAt.toISOString(),
    });
  }

  let cursor = new Date(previousTransitionAt);
  let nextSummaries = summaries;

  while (cursor < observedAt) {
    const segmentEnd = new Date(
      Math.min(startOfNextLocalDay(cursor).getTime(), observedAt.getTime()),
    );
    const minutes = Math.floor((segmentEnd.getTime() - cursor.getTime()) / MS_PER_MINUTE);
    const date = localDateKey(cursor);
    const summary = getSummaryForDate(nextSummaries, date);

    nextSummaries = upsertSummary(
      nextSummaries,
      addMinutes(summary, previousState, minutes, observedAt.toISOString()),
    );
    cursor = segmentEnd;
  }

  return upsertSummary(nextSummaries, {
    ...getSummaryForDate(nextSummaries, localDateKey(observedAt)),
    lastUpdatedAt: observedAt.toISOString(),
  });
}

export function latestSummaries(
  summaries: HomeAwayDailySummary[],
  days: number,
  now: Date = new Date(),
): HomeAwayDailySummary[] {
  const keys = new Set<string>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.add(localDateKey(d));
  }

  return Array.from(keys).map((date) => getSummaryForDate(summaries, date));
}

function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayOffsetFromToday(dateKey: string, now: Date): number {
  const today = parseLocalDateKey(localDateKey(now));
  const target = parseLocalDateKey(dateKey);
  const msPerDay = 86_400_000;
  return Math.round((today.getTime() - target.getTime()) / msPerDay);
}

export function homeAwayDayHeading(
  dateKey: string,
  now: Date = new Date(),
): HomeAwayDayHeading {
  const secondary = dateKey;
  const offset = dayOffsetFromToday(dateKey, now);

  if (offset === 0) {
    return { primary: "Today", secondary };
  }
  if (offset === 1) {
    return { primary: "Yesterday", secondary };
  }
  if (offset >= 2 && offset <= 6) {
    return { primary: `${offset} days ago`, secondary };
  }

  const date = parseLocalDateKey(dateKey);
  const primary = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { primary, secondary };
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

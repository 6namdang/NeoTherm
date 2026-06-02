import { Platform } from "react-native";
import {
  isHealthDataAvailableAsync,
  queryQuantitySamples,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";

const STEP_TYPE = "HKQuantityTypeIdentifierStepCount";
const FLIGHTS_TYPE = "HKQuantityTypeIdentifierFlightsClimbed";
const READ_TYPES = [STEP_TYPE, FLIGHTS_TYPE] as const;

export type AppleHealthStepsSummary = {
  date: string;
  steps: number;
};

export type AppleHealthStepsHistoryPoint = {
  date: string;
  label: string;
  steps: number;
};

export type AppleHealthFlightsHistoryPoint = {
  date: string;
  label: string;
  flights: number;
};

export type AppleHealthFlightsSummary = {
  date: string;
  flights: number;
  averageDailyFlights: number;
};

export type AppleHealthDashboardSummary = {
  available: boolean;
  authorized: boolean;
  steps: AppleHealthStepsSummary | null;
  stepsHistory: AppleHealthStepsHistoryPoint[];
  flights: AppleHealthFlightsSummary | null;
  flightsHistory: AppleHealthFlightsHistoryPoint[];
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayKey(date: Date): string {
  const d = startOfDay(date);
  return d.toISOString();
}

function shortWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export async function requestAppleHealthAccess(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  const available = await isHealthDataAvailableAsync();
  if (!available) return false;
  return requestAuthorization({ toRead: [...READ_TYPES] });
}

export async function loadAppleHealthDashboardSummary(): Promise<AppleHealthDashboardSummary> {
  if (Platform.OS !== "ios") {
    return {
      available: false,
      authorized: false,
      steps: null,
      stepsHistory: [],
      flights: null,
      flightsHistory: [],
    };
  }

  const available = await isHealthDataAvailableAsync();
  if (!available) {
    return {
      available: false,
      authorized: false,
      steps: null,
      stepsHistory: [],
      flights: null,
      flightsHistory: [],
    };
  }

  const now = new Date();
  const todayStart = startOfToday();
  const historyStart = addDays(todayStart, -6);

  const [stepSamples, stepHistorySamples, flightSamples, flightHistorySamples] =
    await Promise.all([
      queryQuantitySamples(STEP_TYPE, {
        limit: 0,
        unit: "count",
        ascending: true,
        filter: {
          date: {
            startDate: todayStart,
            endDate: now,
          },
        },
      }),
      queryQuantitySamples(STEP_TYPE, {
        limit: 0,
        unit: "count",
        ascending: true,
        filter: {
          date: {
            startDate: historyStart,
            endDate: now,
          },
        },
      }),
      queryQuantitySamples(FLIGHTS_TYPE, {
        limit: 0,
        unit: "count",
        ascending: true,
        filter: {
          date: {
            startDate: todayStart,
            endDate: now,
          },
        },
      }),
      queryQuantitySamples(FLIGHTS_TYPE, {
        limit: 0,
        unit: "count",
        ascending: true,
        filter: {
          date: {
            startDate: historyStart,
            endDate: now,
          },
        },
      }),
    ]);

  const steps = Math.round(
    stepSamples.reduce((sum, sample) => sum + sample.quantity, 0),
  );
  const flights = Math.round(
    flightSamples.reduce((sum, sample) => sum + sample.quantity, 0),
  );
  const averageDailyFlights = Math.round(
    flightHistorySamples.reduce((sum, sample) => sum + sample.quantity, 0) / 7,
  );

  const historyByDate = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(historyStart, i);
    historyByDate.set(dayKey(d), 0);
  }
  for (const sample of stepHistorySamples) {
    const key = dayKey(sample.startDate);
    historyByDate.set(key, (historyByDate.get(key) ?? 0) + sample.quantity);
  }
  const stepsHistory = Array.from(historyByDate.entries()).map(([date, count]) => ({
    date,
    label: shortWeekday(new Date(date)),
    steps: Math.round(count),
  }));

  const flightsByDate = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(historyStart, i);
    flightsByDate.set(dayKey(d), 0);
  }
  for (const sample of flightHistorySamples) {
    const key = dayKey(sample.startDate);
    flightsByDate.set(key, (flightsByDate.get(key) ?? 0) + sample.quantity);
  }
  const flightsHistory = Array.from(flightsByDate.entries()).map(([date, count]) => ({
    date,
    label: shortWeekday(new Date(date)),
    flights: Math.round(count),
  }));

  return {
    available: true,
    authorized: true,
    steps: {
      date: todayStart.toISOString(),
      steps,
    },
    stepsHistory,
    flights: {
      date: todayStart.toISOString(),
      flights,
      averageDailyFlights,
    },
    flightsHistory,
  };
}

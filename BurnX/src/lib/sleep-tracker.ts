import { Pedometer } from "expo-sensors";
import { AppState, DeviceEventEmitter, Platform, type AppStateStatus } from "react-native";

import { bxLog } from "./debug-log";
import { getHomeAwayTrackerState } from "./home-location-storage";
import {
  isBedtimeEligible,
  isSleepDurationEligible,
  isStepCountEligible,
  SLEEP_PEDOMETER_DELAY_MS,
} from "./sleep-compiler";
import {
  addSleepMinutesForBlock,
  clearSleepAnchor,
  getSleepAnchor,
  setSleepAnchor,
} from "./sleep-storage";

let registered = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function evaluatePotentialBedtime(now: Date = new Date()): Promise<void> {
  const tracker = await getHomeAwayTrackerState();
  if (!isBedtimeEligible(now.getHours(), tracker.currentState === "inside")) {
    return;
  }

  await setSleepAnchor(now.toISOString());
}

export async function evaluatePotentialWakeup(now: Date = new Date()): Promise<boolean> {
  const anchorIso = await getSleepAnchor();
  if (!anchorIso) return false;

  await clearSleepAnchor();

  const anchorDate = new Date(anchorIso);
  if (Number.isNaN(anchorDate.getTime())) {
    bxLog("sleep-tracker", "invalid anchor timestamp", anchorIso);
    return false;
  }

  if (!isSleepDurationEligible(anchorDate, now)) {
    return false;
  }

  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) {
      bxLog("sleep-tracker", "pedometer unavailable on wakeup");
      return false;
    }

    await delay(SLEEP_PEDOMETER_DELAY_MS);
    const result = await Pedometer.getStepCountAsync(anchorDate, now);
    const steps = result?.steps ?? 0;

    if (!isStepCountEligible(steps)) {
      bxLog("sleep-tracker", "sleep block rejected by step guard", steps);
      return false;
    }

    await addSleepMinutesForBlock(anchorDate, now);
    DeviceEventEmitter.emit("burnx-sleep-refresh");
    return true;
  } catch (caught) {
    bxLog("sleep-tracker", "wakeup evaluation failed", caught);
    return false;
  }
}

function isBedtimeTransition(prev: AppStateStatus, next: AppStateStatus): boolean {
  return next === "background" && (prev === "active" || prev === "inactive");
}

function isWakeupTransition(prev: AppStateStatus, next: AppStateStatus): boolean {
  return next === "active" && (prev === "background" || prev === "inactive");
}

export function registerSleepTrackerHandlers(): () => void {
  if (registered || Platform.OS !== "ios") {
    return () => {};
  }

  registered = true;
  let currentState = AppState.currentState;

  const subscription = AppState.addEventListener("change", (nextState) => {
    const prevState = currentState;
    currentState = nextState;

    if (isBedtimeTransition(prevState, nextState)) {
      void evaluatePotentialBedtime().catch((caught) => {
        bxLog("sleep-tracker", "bedtime evaluation failed", caught);
      });
      return;
    }

    if (isWakeupTransition(prevState, nextState)) {
      void evaluatePotentialWakeup().catch((caught) => {
        bxLog("sleep-tracker", "wakeup evaluation failed", caught);
      });
    }
  });

  return () => {
    subscription.remove();
    registered = false;
  };
}

export async function getSleepMotionPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const response = await Pedometer.getPermissionsAsync();
    return response.granted === true;
  } catch {
    return false;
  }
}

export async function requestSleepMotionPermission(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return false;
    const response = await Pedometer.requestPermissionsAsync();
    return response.granted === true;
  } catch {
    return false;
  }
}

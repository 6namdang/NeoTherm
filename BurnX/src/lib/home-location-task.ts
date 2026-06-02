import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { applyHomeAwayTransition } from "./home-location-accumulator";
import {
  getHomeAwaySummaries,
  getHomeAwayTrackerState,
  setHomeAwaySummaries,
  setHomeAwayTrackerState,
} from "./home-location-storage";
import { clearSleepAnchor } from "./sleep-storage";
import type { HomeAwayState } from "./home-location-types";
import { bxLog } from "./debug-log";

export const HOME_AWAY_GEOFENCE_TASK = "burnx-home-away-geofence";

type GeofenceTaskData = {
  eventType?: Location.GeofencingEventType;
  region?: Location.LocationRegion;
};

function stateForEvent(
  eventType: Location.GeofencingEventType | undefined,
): HomeAwayState | null {
  if (eventType === Location.GeofencingEventType.Enter) return "inside";
  if (eventType === Location.GeofencingEventType.Exit) return "outside";
  return null;
}

async function recordHomeAwayState(nextState: HomeAwayState, observedAt: Date) {
  const [tracker, summaries] = await Promise.all([
    getHomeAwayTrackerState(),
    getHomeAwaySummaries(),
  ]);

  const previousTransitionAt = tracker.lastTransitionAt
    ? new Date(tracker.lastTransitionAt)
    : null;

  const nextSummaries = applyHomeAwayTransition({
    previousState: tracker.currentState,
    previousTransitionAt,
    nextState,
    observedAt,
    summaries,
  });

  await Promise.all([
    setHomeAwaySummaries(nextSummaries),
    setHomeAwayTrackerState({
      currentState: nextState,
      lastTransitionAt: observedAt.toISOString(),
      lastUpdatedAt: observedAt.toISOString(),
    }),
  ]);
}

export function defineHomeAwayGeofenceTask(): void {
  if (TaskManager.isTaskDefined(HOME_AWAY_GEOFENCE_TASK)) return;

  TaskManager.defineTask<GeofenceTaskData>(
    HOME_AWAY_GEOFENCE_TASK,
    async ({ data, error }) => {
      if (error) {
        bxLog("home-location", "geofence task error", error.message);
        return;
      }

      const nextState = stateForEvent(data?.eventType);
      if (!nextState) {
        bxLog("home-location", "ignored geofence event", data?.eventType);
        return;
      }

      if (nextState === "outside") {
        await clearSleepAnchor().catch((caught) => {
          bxLog("home-location", "clear sleep anchor on exit failed", caught);
        });
      }

      await recordHomeAwayState(nextState, new Date()).catch((caught) => {
        bxLog("home-location", "record geofence event failed", caught);
      });
    },
  );
}

defineHomeAwayGeofenceTask();

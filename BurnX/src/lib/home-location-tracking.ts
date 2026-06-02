import * as Location from "expo-location";
import { Platform } from "react-native";

import { applyHomeAwayTransition } from "./home-location-accumulator";
import { inferHomeAwayStateFromGps } from "./home-location-inference";
import {
  clearHomeAwayTrackingData,
  getHomeAwaySnapshot,
  getHomeAwaySummaries,
  getHomeAwayTrackerState,
  setHomeAwaySummaries,
  setHomeAwayTrackerState,
  setHomeLocationConfig,
  updateHomeLocationConfig,
} from "./home-location-storage";
import { HOME_AWAY_GEOFENCE_TASK, defineHomeAwayGeofenceTask } from "./home-location-task";
import { clearSleepTrackingData } from "./sleep-storage";
import type {
  HomeAwaySnapshot,
  HomeAwayState,
  HomeLocationConfig,
} from "./home-location-types";
import {
  HOME_LOCATION_DEFAULT_RADIUS_METERS,
  HOME_LOCATION_MAX_RADIUS_METERS,
  HOME_LOCATION_MIN_RADIUS_METERS,
} from "./home-location-types";

export type HomeAwayPermissionSnapshot = {
  foreground: Location.PermissionStatus | "unavailable";
  background: Location.PermissionStatus | "unavailable";
  servicesEnabled: boolean;
};

export type EnableHomeAwayTrackingResult = {
  permissions: HomeAwayPermissionSnapshot;
  snapshot: HomeAwaySnapshot;
};

export type EnableHomeAwayTrackingFromAddressInput = {
  address: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

export type ReconcileHomeAwayPermissionsResult = {
  permissions: HomeAwayPermissionSnapshot;
  backgroundOk: boolean;
  geofencePaused: boolean;
};

export function hasHomeAwayLocationPermission(
  permissions: HomeAwayPermissionSnapshot | null,
): boolean {
  return (
    permissions?.servicesEnabled === true &&
    permissions.foreground === Location.PermissionStatus.GRANTED &&
    permissions.background === Location.PermissionStatus.GRANTED
  );
}

function clampRadius(radiusMeters: number): number {
  if (!Number.isFinite(radiusMeters)) return HOME_LOCATION_DEFAULT_RADIUS_METERS;
  return Math.min(
    HOME_LOCATION_MAX_RADIUS_METERS,
    Math.max(HOME_LOCATION_MIN_RADIUS_METERS, Math.round(radiusMeters)),
  );
}

function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ");
}

export async function getHomeAwayPermissionSnapshot(): Promise<HomeAwayPermissionSnapshot> {
  if (Platform.OS === "web") {
    return {
      foreground: "unavailable",
      background: "unavailable",
      servicesEnabled: false,
    };
  }

  const [foreground, background, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);

  return {
    foreground: foreground.status,
    background: background.status,
    servicesEnabled,
  };
}

async function requestAndVerifyBackgroundPermission(): Promise<Location.PermissionStatus> {
  const requested = await Location.requestBackgroundPermissionsAsync();
  if (requested.status === Location.PermissionStatus.GRANTED) {
    return requested.status;
  }

  const verified = await Location.getBackgroundPermissionsAsync();
  return verified.status;
}

/** Triggers the system location prompts so iOS lists Location under Settings → NeoTherm. */
export async function primeHomeAwayLocationPermissions(): Promise<HomeAwayPermissionSnapshot> {
  if (Platform.OS === "web") {
    return getHomeAwayPermissionSnapshot();
  }

  await Location.requestForegroundPermissionsAsync();
  await requestAndVerifyBackgroundPermission();
  return getHomeAwayPermissionSnapshot();
}

async function startHomeGeofence(config: HomeLocationConfig): Promise<void> {
  defineHomeAwayGeofenceTask();

  await Location.startGeofencingAsync(HOME_AWAY_GEOFENCE_TASK, [
    {
      identifier: "home",
      latitude: config.latitude,
      longitude: config.longitude,
      radius: config.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}

export async function stopHomeAwayTracking(): Promise<void> {
  if (Platform.OS !== "web") {
    const started = await Location.hasStartedGeofencingAsync(HOME_AWAY_GEOFENCE_TASK);
    if (started) {
      await Location.stopGeofencingAsync(HOME_AWAY_GEOFENCE_TASK);
    }
  }

  await clearHomeAwayTrackingData();
  await clearSleepTrackingData();
}

export async function refreshHomeAwayStateFromCurrentLocation(): Promise<HomeAwaySnapshot> {
  const snapshot = await getHomeAwaySnapshot();
  if (Platform.OS === "web" || !snapshot.config) return snapshot;

  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) return snapshot;

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });
  const observedAt = new Date();
  const tracker = await getHomeAwayTrackerState();
  const nextState = inferHomeAwayStateFromGps(
    {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      accuracyMeters: current.coords.accuracy,
    },
    snapshot.config,
    tracker.currentState,
  );
  const summaries = await getHomeAwaySummaries();

  const nextSummaries = applyHomeAwayTransition({
    previousState: tracker.currentState,
    previousTransitionAt: tracker.lastTransitionAt
      ? new Date(tracker.lastTransitionAt)
      : null,
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

  return getHomeAwaySnapshot();
}

export async function enableHomeAwayTrackingFromAddress({
  address,
  latitude,
  longitude,
  radiusMeters = HOME_LOCATION_DEFAULT_RADIUS_METERS,
}: EnableHomeAwayTrackingFromAddressInput): Promise<EnableHomeAwayTrackingResult> {
  if (Platform.OS === "web") {
    throw new Error("Home/away tracking requires a native iOS or Android build.");
  }

  const normalizedAddress = normalizeAddress(address);
  if (normalizedAddress.length < 8) {
    throw new Error("Enter a complete home address before continuing.");
  }

  let coordinate =
    typeof latitude === "number" &&
    typeof longitude === "number"
      ? {
          latitude,
          longitude,
        }
      : null;

  if (!coordinate) {
    const geocoded = await Location.geocodeAsync(normalizedAddress);
    const first = geocoded[0];
    if (!first) {
      throw new Error("NeoTherm could not find that address. Check it and try again.");
    }
    coordinate = {
      latitude: first.latitude,
      longitude: first.longitude,
    };
  }

  const permissions = await primeHomeAwayLocationPermissions();
  if (permissions.foreground !== Location.PermissionStatus.GRANTED) {
    throw new Error(
      "Location permission was not granted. Enable Location for NeoTherm in iPhone Settings, then try again.",
    );
  }

  if (permissions.background !== Location.PermissionStatus.GRANTED) {
    throw new Error(
      "NeoTherm could not verify Always location permission yet. Open iPhone Settings, choose NeoTherm, set Location to Always with Precise Location on, then return and tap Set Up This iPhone again.",
    );
  }

  const now = new Date().toISOString();
  const observedAt = new Date();

  const config: HomeLocationConfig = {
    enabled: true,
    addressLabel: normalizedAddress,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    radiusMeters: clampRadius(radiusMeters),
    createdAt: now,
    updatedAt: now,
  };

  await setHomeLocationConfig(config);

  let initialState: HomeAwayState = "unknown";
  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    initialState = inferHomeAwayStateFromGps(
      {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracyMeters: current.coords.accuracy,
      },
      config,
      "unknown",
    );
  } catch {
    // No live fix yet — geofence enter/exit or a later refresh will set state.
  }

  await setHomeAwayTrackerState({
    currentState: initialState,
    lastTransitionAt: observedAt.toISOString(),
    lastUpdatedAt: observedAt.toISOString(),
  });

  await startHomeGeofence(config);

  return {
    permissions: await getHomeAwayPermissionSnapshot(),
    snapshot: await getHomeAwaySnapshot(),
  };
}

export async function ensureHomeAwayTrackingRegistered(): Promise<void> {
  if (Platform.OS === "web") return;

  const snapshot = await getHomeAwaySnapshot();
  if (!snapshot.config) return;

  const permissions = await getHomeAwayPermissionSnapshot();
  if (!hasHomeAwayLocationPermission(permissions)) return;

  if (!snapshot.config.enabled) {
    await updateHomeLocationConfig({ enabled: true });
  }

  const started = await Location.hasStartedGeofencingAsync(HOME_AWAY_GEOFENCE_TASK);
  if (!started) {
    await startHomeGeofence(snapshot.config);
  }
}

export async function reconcileHomeAwayPermissionsOnForeground(): Promise<ReconcileHomeAwayPermissionsResult> {
  const permissions = await getHomeAwayPermissionSnapshot();
  const snapshot = await getHomeAwaySnapshot();
  const backgroundOk = hasHomeAwayLocationPermission(permissions);

  if (!snapshot.config) {
    return { permissions, backgroundOk, geofencePaused: false };
  }

  let geofencePaused = false;

  if (Platform.OS !== "web") {
    const started = await Location.hasStartedGeofencingAsync(HOME_AWAY_GEOFENCE_TASK);

    if (!backgroundOk && started) {
      await Location.stopGeofencingAsync(HOME_AWAY_GEOFENCE_TASK);
      await updateHomeLocationConfig({ enabled: false });
      geofencePaused = true;
    } else if (backgroundOk) {
      await ensureHomeAwayTrackingRegistered();
    }
  }

  return { permissions, backgroundOk, geofencePaused };
}

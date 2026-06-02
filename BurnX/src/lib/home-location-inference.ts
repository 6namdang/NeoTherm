import type { HomeAwayState, HomeLocationConfig } from "./home-location-types";

export type GpsSample = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

const INSIDE_UNCERTAINTY_BUFFER_METERS = 35;
const INSIDE_EXIT_MARGIN_METERS = 80;

function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Infer home/away from a single GPS fix. Indoor GPS is often offset by hundreds of
 * meters, so ambiguous readings near the boundary prefer "inside" over false "away".
 */
export function inferHomeAwayStateFromGps(
  location: GpsSample,
  config: Pick<HomeLocationConfig, "latitude" | "longitude" | "radiusMeters">,
  currentState: HomeAwayState = "unknown",
): HomeAwayState {
  const distance = distanceMeters(location, config);
  const accuracy =
    typeof location.accuracyMeters === "number" && location.accuracyMeters > 0
      ? location.accuracyMeters
      : null;

  if (distance <= config.radiusMeters) {
    return "inside";
  }

  if (accuracy != null) {
    const insideReach = config.radiusMeters + accuracy + INSIDE_UNCERTAINTY_BUFFER_METERS;
    if (distance <= insideReach) {
      return "inside";
    }
  }

  if (currentState === "inside") {
    const exitMargin = Math.max(accuracy ?? 0, INSIDE_EXIT_MARGIN_METERS);
    if (distance <= config.radiusMeters + exitMargin) {
      return "inside";
    }
  }

  return "outside";
}

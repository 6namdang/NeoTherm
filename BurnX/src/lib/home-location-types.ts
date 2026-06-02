export const HOME_LOCATION_DEFAULT_RADIUS_METERS = 150;
export const HOME_LOCATION_MIN_RADIUS_METERS = 100;
export const HOME_LOCATION_MAX_RADIUS_METERS = 500;

export type HomeAwayState = "inside" | "outside" | "unknown";

export type HomeLocationConfig = {
  enabled: boolean;
  addressLabel: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string;
  updatedAt: string;
};

export type HomeAwayTrackerState = {
  currentState: HomeAwayState;
  lastTransitionAt: string | null;
  lastUpdatedAt: string | null;
};

export type HomeAwayDailySummary = {
  date: string;
  homeMinutes: number;
  outsideMinutes: number;
  lastUpdatedAt: string | null;
};

export type HomeAwaySnapshot = {
  config: HomeLocationConfig | null;
  tracker: HomeAwayTrackerState;
  summaries: HomeAwayDailySummary[];
};

export type HomeAwayTransitionInput = {
  previousState: HomeAwayState;
  previousTransitionAt: Date | null;
  nextState: HomeAwayState;
  observedAt: Date;
  summaries: HomeAwayDailySummary[];
};

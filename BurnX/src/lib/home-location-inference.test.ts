import { describe, expect, it } from "vitest";

import { inferHomeAwayStateFromGps } from "./home-location-inference";

const HOME = {
  latitude: 37.7749,
  longitude: -122.4194,
  radiusMeters: 150,
};

describe("inferHomeAwayStateFromGps", () => {
  it("returns inside when the fix is within the home radius", () => {
    expect(
      inferHomeAwayStateFromGps(
        { latitude: HOME.latitude, longitude: HOME.longitude, accuracyMeters: 20 },
        HOME,
        "outside",
      ),
    ).toBe("inside");
  });

  it("prefers inside when GPS error could still overlap home", () => {
    expect(
      inferHomeAwayStateFromGps(
        {
          latitude: HOME.latitude + 0.0015,
          longitude: HOME.longitude,
          accuracyMeters: 120,
        },
        HOME,
        "outside",
      ),
    ).toBe("inside");
  });

  it("keeps inside when the prior state was inside and the fix is only slightly outside", () => {
    expect(
      inferHomeAwayStateFromGps(
        {
          latitude: HOME.latitude + 0.001,
          longitude: HOME.longitude,
          accuracyMeters: 30,
        },
        HOME,
        "inside",
      ),
    ).toBe("inside");
  });

  it("returns outside only when the fix is clearly away from home", () => {
    expect(
      inferHomeAwayStateFromGps(
        {
          latitude: HOME.latitude + 0.02,
          longitude: HOME.longitude,
          accuracyMeters: 25,
        },
        HOME,
        "outside",
      ),
    ).toBe("outside");
  });
});

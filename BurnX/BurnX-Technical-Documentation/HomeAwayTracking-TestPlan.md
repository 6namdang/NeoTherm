# Home/Away Tracking Test Plan

This feature estimates patient time at home and outside home using low-power
geofence boundary events. It is not continuous GPS tracking and should not be
validated with route history or maps.

Accumulation is **timestamp-based retroactive bucketing**, not a live per-minute
timer. When iOS delivers a geofence event or the app reconciles on foreground,
elapsed time since the last check-in is credited day-by-day, split at local
midnight.

## What Can Be Tested Without A Device

- TypeScript and lint validation:

```bash
npx tsc --noEmit
npm run lint
```

- Pure duration logic and day headings in `src/lib/home-location-accumulator.ts`:

```bash
npm run test:accumulator
```

- Dashboard card rendering with empty local summaries.
- Location consent modal behavior and backend form-response submission.
- Clear History action behavior for local summaries.

## What Requires A Physical iPhone

Expo Go is not sufficient for background geofencing. Use a native development
build on a physical iPhone:

```bash
npx expo prebuild
npx expo run:ios --device
```

If Xcode signing blocks background location capabilities for a Personal Team,
record the blockage in `tradeoffs/geolocation-tradeoff.md`.

## Manual Device Test Matrix

1. Sign in or sign up as a patient.
2. Confirm BurnX checks the backend for a `home_location_consent_v1` form response immediately after login/signup.
3. If no consent response exists, confirm the BurnX location consent modal appears automatically.
4. Accept the location consent while physically at home and confirm a `home_location_consent_v1` form response is submitted.
5. Confirm iOS shows native location permission prompts immediately after consent acceptance.
6. Grant foreground and Always/background location permission.
7. Open the dashboard and confirm the **Home / Away** dashboard card is visible only in the patient dashboard.
8. Confirm the card reports enabled/ready status.
9. Move outside the configured home radius and wait for iOS to deliver the exit event.
10. Return inside the radius and wait for the enter event.
11. Lock the phone and repeat an enter/exit test.
12. Kill the app and repeat an enter/exit test.
13. Reopen the app and tap **Refresh Estimate** to reconcile the current state.
14. Confirm the dashboard card shows **today only** (one split bar, no multi-day chart).
15. Tap the card and confirm the detail modal shows **one day at a time** with **Previous day** / **Next day** navigation through up to 30 rolling local calendar days (Today, Yesterday, 2 days ago, …).
16. Confirm opening the detail modal always lands on **Today**.
17. Confirm no map, route, or raw coordinate display.
18. Tap **Clear History** and confirm local tracking data is cleared and geofencing stops.

## Midnight Handover / Multi-Day Idle

Scenario: patient stays inside from Friday evening through Sunday morning without
opening the app or crossing the geofence.

1. Note `lastTransitionAt` (or last exit/enter) on Friday evening while inside.
2. Stay inside all day Saturday without opening NeoTherm.
3. Leave home Sunday morning and wait for the geofence exit (or open the app for foreground reconcile).
4. Open the detail modal and navigate to Friday, Saturday, and Sunday.
5. Expected: Friday receives partial evening home minutes; Saturday receives ~24h
   home minutes; Sunday receives partial morning home minutes. Minutes must not
   bleed across calendar dates.

## Permission Edge Cases

- Deny foreground permission.
- Grant foreground permission but deny Always/background permission.
- Disable Location Services globally in iOS Settings.
- Disable location permission for BurnX after tracking was enabled.
- Downgrade from **Always** to **While Using** after tracking was enabled.
- Disable Precise Location.

Expected behavior: BurnX should explain the limitation, avoid crashing, and avoid
claiming background estimates are active when iOS has not granted the required
permission. When Always is lost, geofencing must stop until Always is restored;
the dashboard card must show **Permission needed**.

## Privacy Checks

- No raw coordinates in normal UI.
- No route history, map, pins, or repeated GPS samples.
- No production logs containing location coordinates.
- Local storage contains only home config, current state, last transition time,
  and daily aggregated summaries.
- Values are labeled as estimated because iOS geofence delivery may be delayed.

# HealthKit Steps And Sleep Test Plan

BurnX reads Apple Health steps and sleep locally on the iPhone. It does not
persist raw HealthKit samples in app storage and does not submit HealthKit data
to the backend in v1.

## Native Build Requirement

HealthKit is native iOS functionality and is not available in Expo Go. After
adding the HealthKit plugin, regenerate and reinstall the native app:

```bash
npx expo prebuild --clean
npx expo run:ios --device
```

If Xcode blocks the HealthKit entitlement for a free Personal Team, record the
blocker in the tradeoff log before changing approach.

## Manual Test Matrix

1. Open the patient dashboard on a physical iPhone.
2. Confirm the Apple Health section appears below Pain Intensity.
3. Tap **Connect**.
4. Grant read access for Steps and Sleep in the Apple Health permission screen.
5. Confirm Steps Today shows a local step total if Apple Health has step data.
6. Confirm Sleep shows last-night sleep duration if Apple Health has sleep data.
7. Deny permission and confirm the section does not crash and remains in a clear permission-needed state.
8. Test with no sleep data and confirm the card says no sleep samples were found.

## Privacy Checks

- No HealthKit values are logged.
- No HealthKit values are submitted to backend form responses.
- No raw HealthKit samples are persisted in local storage.
- The section derives display summaries in memory only.

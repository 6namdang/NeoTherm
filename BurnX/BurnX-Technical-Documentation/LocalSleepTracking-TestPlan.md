# Local Sleep Tracking Test Plan

NeoTherm estimates sleep on-device using phone lock/unlock at home after 7 PM,
a five-hour minimum duration, and a low-step-count guard. No backend, no Apple
Health sleep APIs, and no background sensor streaming.

## What Can Be Tested Without A Device

```bash
npx tsc --noEmit
npm run lint
npm run test:sleep
npm run test:accumulator
```

## What Requires A Physical iPhone

Use a native development build (Expo Go is insufficient for geofencing and motion):

```bash
npx expo prebuild
npx expo run:ios --device
```

After adding `expo-sensors`, run prebuild again so `NSMotionUsageDescription` is
linked.

## Setup Flow

1. Sign in as a patient and complete home/away consent + home address + Always location.
2. Confirm the **Enable movement check** modal appears after home setup.
3. Grant Motion & Fitness permission.
4. Confirm **Estimated sleep** appears in Health Context with Previous/Next day navigation.

## Manual Device Test Matrix

1. At home after 7 PM, lock the phone (NeoTherm may pass `inactive` before `background`).
2. Unlock after at least 5 hours with fewer than 50 steps in that window.
3. Confirm sleep minutes appear for the correct local calendar day(s).
4. Cross-midnight block: lock before midnight, unlock after — minutes split across days.
5. Lock after 7 PM, leave home (geofence exit) before unlock — anchor cleared; no sleep credited.
6. Lock after 7 PM, unlock before 5 hours — no sleep credited.
7. Lock before 7 PM — no anchor set.
8. Lock outside home — no anchor set.
9. Clear Home/Away history — sleep anchor and summaries cleared too.
10. Health Context shows no PSQI or HealthKit sleep; PSQI clinical card on Home still works.

## Permission Edge Cases

- Deny Motion permission — sleep UI hidden; tracker handlers not registered.
- Revoke Motion in Settings — sleep UI hidden after next foreground refresh.

## Privacy Checks

- Sleep summaries stored locally only (SecureStore via `storage.ts`).
- Step counts used only for the unlock guard; not persisted as a trail.
- No Apple Health sleep reads requested.

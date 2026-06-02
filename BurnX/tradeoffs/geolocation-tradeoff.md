# Geolocation Tradeoff Log

Use this append-only log when a home/away tracking implementation path fails
validation and requires a pivot. Do not record raw patient coordinates, street
addresses, tokens, or other sensitive data in this file.

## Template

### YYYY-MM-DD - Short Decision Title

#### Intended Approach
What we attempted and why.

#### Blockage
What failed during implementation or testing.

#### Evidence
Commands, device behavior, errors, or documentation that proved the blockage.

#### Pivot Decision
What changed in the implementation plan.

#### Tradeoff
What we gain, what we lose, and any privacy, clinical, UX, or testing consequences.

## 2026-05-19 - No Pivot Required During Initial Implementation

### Intended Approach
Implement local-first patient home/away tracking with Expo Location geofencing,
TaskManager background events, minimized SecureStore persistence, patient profile
controls, and privacy-preserving duration charts.

### Blockage
No architectural pivot was required during the initial implementation.

### Evidence
`npx tsc --noEmit` and `npm run lint` passed after adapting the geofence task
executor to Expo SDK 54's async TaskManager executor type.

### Pivot Decision
No pivot. The async task executor correction stayed within the intended Expo
geofencing approach.

### Tradeoff
The implementation remains low-power and event-based, but real geofence behavior
still requires physical iPhone validation because simulator and Expo Go cannot
prove iOS background boundary behavior.

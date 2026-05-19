# BurnX Technical Documentation

Enterprise-style technical specification for the **BurnX** mobile/web client: scope, boundaries, architecture, interfaces, onboarding domain, presentation layer, operations, security, and risks.

| Document | Contents |
|----------|----------|
| [**BurnX-Technical-Documentation.md**](./BurnX-Technical-Documentation.md) | **Master specification** — document control, scope, ASCII diagrams, detailed contracts, catalogue, appendices |

This **README** is the short index only.

---

## Quick facts

| Item | Value |
|------|--------|
| Runtime | Expo SDK **~54**, React **19**, React Native **0.81** |
| Router | **expo-router** (file-based stacks + tabs, `Stack.Protected`) |
| Auth | Amazon **Cognito** (`USER_PASSWORD_AUTH`, `REFRESH_TOKEN_AUTH`) |
| Backend | HTTPS API at **`API_BASE_URL`** (`EXPO_PUBLIC_*` override, see `aws-config.ts`) |
| Typography | **Inter** (`@expo-google-fonts/inter`, `expo-font`) |

---

## Diagrams

The master document uses **ASCII line art and tables only** — no diagram plugins required. Use a monospace font when printing or reviewing (PDF exporters should preserve whitespace).

---

## Application code roots

- **`app/`** — Routes and layouts (`index`, `(auth)`, `(onboarding)`, `(app)`, `(app-doctor)`).
- **`src/`** — `lib/` (auth, API, JWT, contexts), `components/`, `theme/`, `state/`, `constants/`, `providers/`.
- **`aws-config.ts`** — Cognito identifiers and default API host; **`EXPO_PUBLIC_API_BASE_URL`** overrides API base URL at build time.

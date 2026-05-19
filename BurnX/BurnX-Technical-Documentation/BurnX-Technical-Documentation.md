# BurnX — Software Design & Technical Specification

---

## Document control

| Field | Value |
|-------|-------|
| **Document title** | BurnX Technical Documentation |
| **Product** | BurnX — patient intake & clinician shell (mobile + web client) |
| **Repository root** | `BurnX/` (Expo / React Native / TypeScript) |
| **Audience** | Software engineering, platform / identity operations, QA, security reviewers, technical program management |
| **Classification** | Internal technical reference (adjust per your organisation’s data classification policy) |
| **Primary notation** | All architecture and flow diagrams in **ASCII** (render in any monospace viewer; printable) |

### Revision history

| Version | Date | Summary |
|---------|------|---------|
| 1.3 | As maintained | Consent modal gate: **`consent_v1`** via **`form-responses`**, **`app/(modal)/consent`**, **`src/lib/consent.ts`** |
| 1.1 | As maintained in Git | Industrial documentation pass: document control, scope, ASCII figures, expanded interfaces & operations |
| 1.0 | Prior | Initial consolidated technical narrative |

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)  
2. [References and standards alignment](#2-references-and-standards-alignment)  
3. [Terms, acronyms, and roles](#3-terms-acronyms-and-roles)  
4. [Stakeholders and boundaries](#4-stakeholders-and-boundaries)  
5. [System overview](#5-system-overview)  
6. [Logical architecture](#6-logical-architecture)  
7. [Deployment and runtime topology](#7-deployment-and-runtime-topology)  
8. [Technology baseline](#8-technology-baseline)  
9. [Repository structure and module catalogue](#9-repository-structure-and-module-catalogue)  
10. [Application composition (providers & navigation)](#10-application-composition-providers--navigation)  
11. [Identity and authentication](#11-identity-and-authentication)  
12. [Session and role resolution](#12-session-and-role-resolution)  
13. [Post-authentication bootstrap](#13-post-authentication-bootstrap)  
14. [Backend integration (REST contract, client-side)](#14-backend-integration-rest-contract-client-side)  
15. [Onboarding domain model](#15-onboarding-domain-model)  
16. [Presentation layer](#16-presentation-layer)  
17. [Operational characteristics](#17-operational-characteristics)  
18. [Security considerations (client-bound)](#18-security-considerations-client-bound)  
19. [Quality attributes and non-functional requirements](#19-quality-attributes-and-non-functional-requirements)  
20. [Risks, gaps, and follow-up work](#20-risks-gaps-and-follow-up-work)  
21. [Appendices](#21-appendices)  
22. [Engineering transparency — LIBRE, read API & design trade-offs](#22-engineering-transparency--libre-read-api--design-trade-offs)  

---

## 1. Purpose and scope

### 1.1 Purpose

This document specifies the **as-built** BurnX client application from a technical and operational perspective suitable for:

- onboarding engineers to the codebase;
- integrating with backend and identity owners (contracts, assumptions, failure modes);
- supporting audits and design reviews without requiring live access to diagrams tooling.

### 1.2 In scope

- Client application housed under `app/`, `src/`, configuration files (`app.json`, `package.json`, `aws-config.ts`).
- End-user flows: landing, authenticated registration/sign-in via Amazon Cognito, onboarding (profile, patient-only clinical intake sections, review), post-onboarding shells (patient tab app, doctor stack placeholder).
- Patient **Care programs**: assignable questionnaires — **LIBRE** (`libre_v1`): nested stack routing, conditional question engine, `GET`/`POST` form responses, completion UX (**§22** for rationale and limits).
- How the client calls the configured HTTPS API (`getMe`, `createMe`, `submitFormResponse`, **`getMyFormResponses`**) and interprets outcomes.
- Local persistence of tokens (native vs web via **`expo-secure-store`** / **`localStorage`**), JWT **payload-only** decode for **`custom:role`** (signature verification delegated to backend), observability switches, build scripts.

### 1.5 Documentation stance (specificity vs. hype)

Sections that describe **motive**, **ordering of decisions**, and **trade-offs** are written so reviewers can reconcile *why* an approach was taken without implying non-existent guarantees (no “military-grade” claims). Limits are stated plainly (e.g. **no offline draft persistence** for LIBRE). Numeric file counts are **approximate snapshots** unless a script is cited.

### 1.3 Out of scope

- Implementation details of Lambda authorizers, DynamoDB schemas, CI/CD pipelines, or production observability backends—unless surfaced by this client’s behavior.
- Clinical validity of questionnaire content beyond describing where it lives in constants.
- HIPAA / SOC2 attestation (this section would be authored by compliance; the technical doc only notes sensitivity of health-related form data).

### 1.4 Assumptions

- Backend exposes REST endpoints under **`API_BASE_URL`** and accepts Bearer tokens issued by the same Cognito user pool referenced in `aws-config.ts`.
- App client permits **`USER_PASSWORD_AUTH`** and **`REFRESH_TOKEN_AUTH`** as implemented in `src/lib/auth.ts`.
- Health data entered in forms is transmitted only over TLS to the backend; the client does not encrypt payloads beyond transport security.

---

## 2. References and standards alignment

### 2.1 Primary references (codebase artefacts)

| Reference | Location |
|-----------|----------|
| Root layout, providers, root navigator guards | `app/_layout.tsx` |
| Cognito integration & token lifecycle | `src/lib/auth.ts` |
| Persistent key-value storage | `src/lib/storage.ts` |
| JWT payload decode / role extraction | `src/lib/jwt.ts` |
| Session (`session`, `role`, `refresh`, `signOut`) | `src/lib/auth-context.tsx` |
| Post-login API bootstrap (`getMe`) | `src/lib/post-auth-context.tsx` |
| Post-login route replacement | `src/lib/post-login-route.ts` |
| HTTP API façade | `src/lib/api.ts` |
| Forms & sections (burn intake, profile) | `src/constants/forms/onboarding.ts` |
| LIBRE / PSQI questionnaire definitions + scales | `src/constants/forms/libre.ts`, `src/constants/forms/psqi.ts`, `src/constants/forms/types.ts` |
| LIBRE conditional visibility helpers | `src/lib/form-engine.ts` |
| Server-driven burn date / last LIBRE submission | `src/lib/burn-date.ts` ← uses `getMyFormResponses` |
| Patient forms navigator (nested stack under tab) | `app/(app)/forms/_layout.tsx`, `index.tsx`, `[formId].tsx` |
| Scale UI + LIBRE chrome | `src/components/forms/FormProgress.tsx`, `ScaleQuestion.tsx` |
| Patient forms catalogue rows | `src/constants/forms/index.ts` (registry **`ALL_FORMS`**: pain intensity + LIBRE + PSQI; **`forms`** for list UI) |
| Study consent copy + `CONSENT_VERSION` | `src/constants/forms/consent.ts` |
| Consent API helpers + Accept callback context | `src/lib/consent.ts`, `src/lib/consent-gate-context.tsx` |
| Blocking consent modal route | `app/(modal)/_layout.tsx`, `app/(modal)/consent.tsx` |

### 2.2 External specifications (conceptual dependency)

| Area | Typical normative references (organisation-specific) |
|------|------------------------------------------------------|
| OAuth 2 / OIDC idioms | Cognito uses JWT access/id tokens (not OAuth2 code-for-token in this app—direct InitiateAuth) |
| Transport | TLS 1.2+ to `cognito-idp.*.amazonaws.com` and API host |
| Mobile hardening | OWASP Mobile / MASVS (token storage, WebView—not used directly here beyond RN web bundle) |

---

## 3. Terms, acronyms, and roles

| Term / acronym | Definition |
|----------------|------------|
| **JWT** | JSON Web Token; id token carries claims including `custom:role`. |
| **Cognito pool** | AWS Cognito User Pool storing BurnX identities. |
| **App shell** | Post-onboarding navigator: `(app)` tabs (patient) or `(app-doctor)` stack (doctor). |
| **Onboarding_completed** | Server-side attribute on **`/me`** response; gates access to app shells when `true`. |
| **EXPO_PUBLIC_*** | Build-time inlined environment prefix for Expo (values visible in client bundle). |

**Application roles**

| Canonical role (`AuthRoleClaim`) | Source | Behavioural split |
|----------------------------------|--------|-------------------|
| `patient` | Cognito signup attr `custom:role` + JWT | Burn intake; **`burn_intake_v1`** POST; **LIBRE** `libre_v1` in Care programs; **`(app)`** tabs. |
| `doctor` | Same | Extended profile fields on **`POST /me`** only; **`(app-doctor)`**; **no** burn intake submit in review path today. |

---

## 4. Stakeholders and boundaries

Figure 4-1. **Bounded context — BurnX mobile/web client.**

```
 +-----------------------------------------------------------------------------+
 |                         ORGANISATION / AWS ACCOUNT                         |
 |  +-----------------------------------------------------------------------+ |
 |  | AMAZON COGNITO (User Pool)                                            | |
 |  | SignUp | ConfirmSignUp | InitiateAuth (PASSWORD + REFRESH)           | |
 |  +-----------------------------------------------------------------------+ |
 |                                      ^                                       |
 |                                      | HTTPS                                |
 +-----------------------------------------------------------------------------+
                                        |
 +-----------------------------------------------------------------------------+
 |                         BURNX CLIENT (THIS REPOSITORY)                       |
 |  +-----------------------------------------------------------------------+ |
 |  | expo-router UI | onboarding forms | SecureStore/localStorage tokens   | |
 |  +-----------------------------------------------------------------------+ |
 |                                      |                                       |
 |                                      | Bearer id_token                       |
 v                                      v                                       |
 +-----------------------------------------------------------------------------+
 |                         BURNX BACKEND (CONFIGURED HTTPS API)                 |
 |  REST: GET/POST /me | GET/POST /form-responses (+ authorizer validates JWT)      |
 +-----------------------------------------------------------------------------+
```

**Consumer / producer summary**

```
  [ End user ] ---> [ BurnX client ] ---> [ Cognito ]     (credential lifecycle)
                       |
                       +------------------> [ HTTPS API ]  (profile + questionnaires incl. LIBRE reads/writes)
```

---

## 5. System overview

### 5.1 Capability summary matrix

```
 +------------------------+----------+-----------+----------------------------+
 | Capability             | Patient  | Doctor    | Implementation anchor      |
 +------------------------+----------+-----------+----------------------------+
 | Cognito signup         | Yes      | Yes       | auth.ts signUp             |
 | Email verification     | Yes      | Yes       | confirmSignUp              |
 | Password login         | Yes      | Yes       | signIn USER_PASSWORD_AUTH  |
 | Profile onboarding     | Yes      | Yes       | PATIENT_/DOCTOR_ form defs |
 | Burn questionnaires    | Yes      | No submit | intake/[section], review    |
 | LIBRE (assignable QoL) | Yes      | No        | (app)/forms/*, POST/GET `/form-responses` |
 | Main signed-in UX      | 3 tabs   | Stack idx | (app)/_layout, (app-dr)    |
 +------------------------+----------+-----------+----------------------------+
```

### 5.2 Delivery footprint (conceptual — not LOC)

ASCII bar legend: each '#' ≈ nominal share of engineered surface for this codebase.

```
 Shared identity + onboarding flow    | ##############################
 Patient shell + questionnaires       | #####################################
 Doctor scaffold shell                | ###############
 Theme / components / infrastructure  | ##########
```

---

## 6. Logical architecture

### 6.1 Layered view

```
 +------------------------------------------------------------+
 |  Layer 7   User-visible screens (routes under app/)         |
 +------------------------------------------------------------+
 |  Layer 6   Feature composition (forms, onboarding context) |
 +------------------------------------------------------------+
 |  Layer 5   Presentation components (Screen, Button, …)       |
 +------------------------------------------------------------+
 |  Layer 4   Theme & typography (tokens)                      |
 +------------------------------------------------------------+
 |  Layer 3   Application state contexts (session, post-auth,   |
 |            onboarding answers, toast)                       |
 +------------------------------------------------------------+
 |  Layer 2   Domain services (auth, api, jwt, validation)    |
 +------------------------------------------------------------+
 |  Layer 1   Platform adapters (SecureStore / localStorage)  |
 |            fetch() to Cognito + API Gateway host           |
 +------------------------------------------------------------+
```

### 6.2 Component-context diagram (deployment-oriented)

```
    +-------------+           +-------------+           +-------------+
    |   iPhone /  |           |   Android   |           |    Web      |
    |    iPad    |           |   devices   |           |  (static)   |
    +------+------+           +------+------+           +------+------+
           |                         |                         |
           +-------------------------+-------------------------+
                                       |
                              +--------v---------+
                              |   BurnX Bundle   |
                              |  (Metro / Expo) |
                              +--------+---------+
                                       |
              +--------------------------+---------------------------+
              |                          |                           |
              v                          v                           v
     +----------------+         +----------------+         +----------------+
     | cognito-idp.   |         | HTTPS API_HOST |         | (Browser       |
     | amazonaws.com  |         | (API_BASE_URL) |         |  localStorage) |
     +----------------+         +----------------+         +----------------+
```

---

## 7. Deployment and runtime topology

### 7.1 Build artefacts

```
 Developer workstation                CI artefact repository (optional)
         |                                         |
         |  expo export / EAS                     |
         v                                         v
   dev client bundle -------------> store build -----> testers / stores
                                            |
 Mobile: .ipa / .aab (via pipeline) -------+
 Web: static files (app.json web.output static)
```

### 7.2 Runtime identities on device

Native path:

```
 SecureStore partitions (key-value encrypted at rest per OS capability)
 Keys: accessToken | idToken | refreshToken | tokenExpiresAt
```

Web path:

```
 window.localStorage
 Same key names — not equivalent security to SecureStore; XSS surface.
```

---

## 8. Technology baseline

### 8.1 Declared dependency versions (`package.json` excerpt — verify at build time)

| Package | Typical constraint | Role |
|---------|---------------------|------|
| `expo` | ~54.0.x | Framework |
| `expo-router` | ~6.0.x | File-based routing, `Stack.Protected` |
| `react` / `react-native` | 19.x / 0.81.x | UI runtime |
| `expo-secure-store` | ~15.x | Credential storage native |
| `react-native-reanimated` | ~4.x | Animated transitions |

### 8.2 Expo project configuration highlights (`app.json`)

| Flag / plugin | Meaning |
|-----------------|---------|
| `newArchEnabled: true` | React Native New Architecture |
| `experiments.typedRoutes: true` | Stronger typed hrefs |
| `experiments.reactCompiler: true` | React Compiler experiment |
| `scheme: burnx` | Deep link scheme for native |
| `web.output: static` | Static web export posture |
| Plugins: `expo-router`, splash, secure-store, datetimepicker, font | Native linkage |

---

## 9. Repository structure and module catalogue

### 9.1 Directory tree

```
 BurnX/
 |-- app/                      Route tree (expo-router)
 |-- src/
 |   |-- components/           Primitives; includes `components/forms/` (LIBRE UI)
 |   |-- constants/            Hospitals; `forms/` (onboarding + LIBRE/PSQI registry `index.ts`)
 |   |-- lib/                  Auth, HTTP, JWT, helpers
 |   |-- providers/            FontsProvider
 |   |-- state/                onboarding-context
 |   `-- theme/                Design tokens
 |-- aws-config.ts             Cognito ids + API base URL resolution
 |-- app.json                  Expo config
 |-- package.json              Scripts & dependencies
 `-- BurnX-Technical-Documentation/
```

### 9.2 Module responsibility matrix (`src/lib/`)

```
 +--------------------------+--------------------------------------------+
 | Module                   | Responsibility                             |
 +--------------------------+--------------------------------------------+
 | auth.ts                  | Cognito JSON API wrapper; tokens in storage|
 | auth-context.tsx         | session + decoded role expose to tree      |
 | post-auth-context.tsx    | GET /me; needsOnboarding; stale sign-out  |
 | post-login-route.ts      | router.replace targets after credentials   |
 | api.ts                   | authFetch, getMe, createMe, submit, **getMyFormResponses** |
 | burn-date.ts             | Injury + last LIBRE timestamps via **GET** (no local cache by design) |
 | form-engine.ts           | LIBRE `showIf` / visible-question walk order              |
 | jwt.ts                   | decodeJwtPayload (no sig); parseRoleFromPayload          |
 | storage.ts               | SecureStore vs localStorage                |
 | auth-forms.ts            | hooks: login, signup flows + routing       |
 | pending-signup-password  | ephemeral password bridging confirm flow   |
 | onboarding-validation.ts | required-field gate on review screen       |
 | question-visibility.ts    | conditional questions (dependsOn)        |
 | debug-log.ts             | gated console tagging                      |
 +--------------------------+--------------------------------------------+
```

### 9.3 Source inventory (verified file counts — TypeScript modules only)

```
 Area                          Snapshot (~)   Notes
 ----------------------------  -------------  -------------------------
 app/ routes + layouts                  19   Includes `(app)/forms/*` stack (3 files)
 src/ (all `.ts`/`.tsx`)                46   Adds `components/forms/`, `lib/*`, `constants/forms/*`
```

*Counts are point-in-time from the repository; they drift with every commit. They are not quality metrics.*

---

## 10. Application composition (providers & navigation)

### 10.1 Provider nesting (startup order outer → inner)

```
 SafeAreaProvider
   '-- FontsProvider
         '-- SessionProvider
               '-- PostAuthProvider
                     '-- ToastProvider
                           '-- RootNavigator  (+ NavigationLogger sibling)
                                 '-- ConsentGateProvider  ← wraps `Stack` once past loading (consent callback for Accept)
                                       '-- Stack.{Protected...}
```

### 10.2 Root navigator state machine (ASCII)

Notation: `{guard expression}` evaluates true when Stack.Protected mounts that subtree.

Figure 10-1. **Decision graph — which stack is mounted.**

```
                                +----------------+
                                |  RootNavigator |
                                +--------+-------+
                                         |
                                         v
                          +--------------+---------------+
                          | bootstrapping OR             |
                          | consent verifying OR          |
                          | (session && resolved &&       |
                          |  !needsOnboarding &&         |
                          |  role===null)  [EDGE CASE]  |
                          +--------------+---------------+
                                    |YES        |NO
                                    v           v
                            +-------+----+   +---+------------+
                            | FULLSCREEN |   | session?       |
                            | spinner    |   +---+------------+
                            +------------+       |YES     |NO
                                                 v        v
                                    +-----------+---+  +---+----------+
                                    |needsOnboarding? |  |(auth)+index|
                                    +----+---------+---+  +------------+
                                         |YES  |NO
                                         v     v
                         +---------------+ +---------------------------+
                         | (onboarding)  | consent required for shell?  |
                         +---------------+ +-------------+---------------+
                                                     |YES            |NO
                                                     v               v
                                              +-----------+    +----+------+
                                              | (modal)   |    | (app-doctor)|
                                              | consent   |    | or (app) |
                                              +-----------+    +----------+
```

After **`onboarding_completed`** is true, **`hasConsented()`** in **`src/lib/consent.ts`** calls **`GET /form-responses`** for **`CONSENT_VERSION`** (currently **`consent_v1`**). If no matching row mounts **`app/(modal)/consent`** (**`presentation: modal`**, **`gestureEnabled: false`** on screen). **`Accept`** **`POST`**s **`/form-responses`** with **`form_id: consent_v1`**; **`Decline`** signs out and returns to **`/`**. Bump **`CONSENT_VERSION`** in [`src/constants/forms/consent.ts`](src/constants/forms/consent.ts) to re-prompt users who only have legacy rows.

### 10.3 Guard predicates (truth source: `RootNavigator`)

```
 eligibleForConsent = session && postAuthReady && !needsOnboarding &&
                      (role==="patient" || role==="doctor")

 consentModalGate  = eligibleForConsent && consentState==="required"

 patientAppGate    = eligibleForConsent && role==="patient" && consentState==="complete"

 doctorAppGate     = eligibleForConsent && role==="doctor" && consentState==="complete"
```

Bootstrapping:

```
 bootstrapping = sessionLoading OR (session && !postAuthReady)
```

Loading screen also covers **`consentState==="loading"`** (verifying consent) and **`waitingResolvedRole`** (onboarding done server-side but JWT role not yet usable).

### 10.4 Route manifest (URLs omit group parens)

| Path (logical) | File | Remarks |
|----------------|------|---------|
| `/` | `app/index.tsx` | Public landing |
| `/login`, `/signup`, `/confirm`, … | `app/(auth)/*` | Auth stack animation: `fade_from_bottom` into auth from landing platform block |
| `/profile-creation` | `app/(onboarding)/profile-creation.tsx` | Onboarding redirect from `index` in group |
| `/intake/{section}` | `app/(onboarding)/intake/[section].tsx` | Patient multi-step |
| `/review` | `app/(onboarding)/review.tsx` | Persist profile + optionally intake payload |
| `/consent` | `app/(modal)/consent.tsx` | Blocking study agreement (`gestureEnabled: false`); **`consent_v1`** via **`POST /form-responses`** |
| `/forms` (list) | `app/(app)/forms/index.tsx` | Care programs root; **nested `Stack`** sibling to other tab screens |
| `/forms/{formId}` | `app/(app)/forms/[formId].tsx` | **LIBRE** runner when `formId=libre_v1`; unknown id → message + back |
| `/(app)` internal tabs | `app/(app)/index.tsx`, **`forms/`** (directory), `profile.tsx`, `_layout.tsx` | **Second tab** resolves to `forms` **folder** (`forms/index`, not a single `forms.tsx` file) |

**Routing note:** Migrating from a single `forms.tsx` tab screen to `app/(app)/forms/` avoids a file/folder name collision and allows **`Stack` inside the tab** (`forms/_layout.tsx`) so the runner pushes without leaving the Care programs tab container.

Doctor stack: **`app/(app-doctor)/index.tsx`** (+ `_layout.tsx` headers as implemented).

---

## 11. Identity and authentication

### 11.1 Credential lifecycle sequence (ASCII timeline)

Legend: `[Client]` `[Cognito]` `[Storage]`

```
 Sign-in (happy path)
 --------------------
 [Client]  InitiateAuth(USER_PASSWORD_AUTH, USERNAME/PASSWORD)
      |-------------------------------------------->[Cognito]
      |<------------ AuthenticationResult -------------
      |
      +- set accessToken, idToken, refreshToken, tokenExpiresAt --->[Storage]


 Token use before REST call (proactive refresh)
 ----------------------------------------------
 [Client] getValidIdToken()
      |- read tokenExpiresAt [Storage]
      |- if near expiry (> now - 60s) -----------------------------> refreshSession()

 refreshSession()
 --------------
 [Client] InitiateAuth(REFRESH_TOKEN_AUTH)
      |---------------------------------------->[Cognito]
      |<------- new tokens / expiry -------------
      +- update Storage

 signOut()
 ---------
 [Client] delete keys: accessToken, idToken, refreshToken, tokenExpiresAt
```

### 11.2 Cognito request envelope (implementation invariant)

HTTP POST **`https://cognito-idp.<region>.amazonaws.com/`**

```
 Header: Content-Type: application/x-amz-json-1.1
 Header: X-Amz-Target: AWSCognitoIdentityProviderService.<OperationName>
 Body: JSON (client id, credentials, ...)
```

Operational note: disabling **`ALLOW_USER_PASSWORD_AUTH`** surfaces a deterministic user-facing remediation string in **`auth.ts`** (pool admin playbook item).

---

## 12. Session and role resolution

Figure 12-1. **From stored id token → application role**

```
                     +--------------------------+
 Stored id_token     |  decodeJwtPayload        |
 (JWT string)  ----->|  (middle segment Base64URL|
                     |   JSON parse — NO sig)   |
                     +------------+-------------+
                                  |
                                  v payload Record
                     +------------+-------------+
                     | parseRoleFromPayload       |
                     | scans keys in order:      |
                     |  custom:role, custom_role,|
                     |  role                       |
                     +------------+-------------+
                                  |
          +-----------------------+-----------------------+
          v                       v                       v
     "patient"                "doctor"              null / unknown
  (explicit)            (doctor|clinician|          force onboarding funnel
                         physician|provider)
```

**Session provider outputs**

```
 session : boolean       <-- isLoggedIn() ≈ refreshToken present
 role    : "patient"|"doctor"|null
 isLoading               <-- during refresh()/initial probe
 refresh()               <-- re-read tokens + decode role after login
 signOut()               <-- clear storage keys + invalidate context
```

---

## 13. Post-authentication bootstrap

### 13.1 `PostAuthProvider` algorithm (pseudocode)

```
 function runBootstrap():
   IF NOT session THEN
        needsOnboarding := false ; me := undefined ; ready := true ; RETURN

   IF NOT role THEN
        needsOnboarding := true ; me := undefined ; ready := true ; RETURN
                     // JWT missing recognizable role ⇒ funnel until resolved

   ready := false
   TRY row := getMe()
        needsOnboarding := row==NULL OR row.onboarding_completed!=true
        me := row
   CATCH err
        IF isStaleSessionError(err) THEN
           signOut(); me:=undefined; needsOnboarding:=false
        ELSE
           me:=null; needsOnboarding:=true // degraded tolerance
   FINALLY
        ready := true
```

Stale session heuristic substrings include: `401`, `unauthorized`, `session expired`, `no refresh token`, `cannot refresh tokens`, **`NotAuthorizedException`**, **`user does not exist`**, and related phrases (inspect `post-auth-context.tsx` for exhaustive list).

### 13.2 Truth table: `needsOnboarding`

```
 +----+---------+--------+----------+------------------------+------------------+
 | # | session |  role | getMe OK | onboarding_completed | needsOnboarding  |
 +----+---------+--------+----------+------------------------+------------------+
 | 1 |   F     |  *     |   n/a    |         n/a            |       F           |
 | 2 |   T     | null   | skipped  |        n/a            |       T           |
 | 3 |   T     | OK     | 404      |        n/a            |       T           |
 | 4 |   T     | OK     | 200 row  |         false/null     |       T           |
 | 5 |   T     | OK     | 200 row  |         true           |       F           |
 | 6 |   T     | OK     | err stale|       n/a → sign-out   |       F→logout    |
 | 7 |   T     | OK     | other err|        n/a            |       T           |
 +----+---------+--------+----------+------------------------+------------------+
```

### 13.3 Cold start coupling: Session ↔ Post-auth

Figure 13-1. **Temporal coupling (mounted providers)**

```
  time -->
   |
   |  SessionProvider.mount
   |       |--> refresh(): read refreshToken?, load id decode role set session/isLoading=false
   |
   |  PostAuthProvider sees session & role deps
   |       |--> runBootstrap(): await getMe ...
   |
   |  RootNavigator observes isLoading||postAuth !ready ==> spinner
   v
```

---

## 14. Backend integration (REST contract, client-side)

Base URL **`API_BASE_URL`**: **`EXPO_PUBLIC_API_BASE_URL`** wins if non-empty post-trim else default host in **`aws-config.ts`**; trailing slash stripped.

### 14.1 Endpoints invoked by implementation

```
 +--------+------+----+---------------------------------------------+
 | Method | Path | Fn | Behaviour (client interpretation)           |
 +--------+------+----+---------------------------------------------+
 | GET    | /me  |GM  | 200 JSON MeResponse | 404 => null row | else throw |
 | POST   | /me  |CM  | 2xx silent success | body snake_case-ish fields |
 | GET    | /form-responses |GR | 200 `{ items?, count?, ... }` — see §14.3 |
 | POST   | /form-responses |SF | 2xx — submit answers JSON envelope optional |
 +--------+------+----+---------------------------------------------+
```

All honoured calls attach:

```
 Authorization: Bearer <id_token_current>
```

Proactive **`getValidIdToken`** refreshes roughly **60 seconds** prior to recorded expiry **`tokenExpiresAt`**.

### 14.2 `authFetch` retry ladder (401 path)

Figure 14-1. **HTTP outbound state**

```
 Attempt 1: fetch(...)
     |
     v
 status==401 ? ----NO----> return Response
     |
    YES
     v
 refreshSession()
     fails? --> throw USER_MESSAGE("session expired re-login")
     |
    success
     v
 Attempt 2: fetch(...)
     |
     return Response
```

### 14.3 Request / response schemas (as consumed by BurnX TS types)

#### GET `/me` → `MeResponse` (client type)

```
 {
   onboarding_completed: boolean       // authoritative gate vs shell
   name?: string                         // surfaced where UI reads me
   hospital_id?: string
 }
```

#### POST `/me` — `createMe` payload construction

Mandatory string fields **`name`**, **`hospital_id`**.

Doctor-only optional (**if non-empty in UI answers** mapped in `review.tsx`): **`title`**, **`specialty`**, **`department`**.

(JSON keys sent as produced in `createMe`; comment in code stresses snake_case expectation at Lambda.)

#### GET `/form-responses`

Client helper **`getMyFormResponses(formId?, limit?)`**:

- Builds path **`/form-responses?`** with optional **`form_id=<id>`** and **`limit=<n>`** (`URLSearchParams`; default **limit 50** when caller omits second arg).
- **GET** via **`authFetch`** (same **`Authorization: Bearer`** as other calls — server must scope rows to the JWT subject).
- Parses JSON body; throws if non-**`ok`** (shared **`readErrorMessage`**).
- Returns **`FormResponse[]`** (the **`items`** array from the envelope, or **`[]`** if **`items`** is missing/not an array — defensive client-side).

Type **`FormResponse`** in `api.ts` documents the row shape the client expects (must match API contract):

```
 {
   hospital_id: string
   sk: string
   patient_id: string
   created_at: string       // used by **`getLastCompletion(formId)`** (per questionnaire)
   response_id: string
   form_id: string         // e.g. "libre_v1", "burn_intake_v1"
   answers: Record<string, unknown>
 }
```

**Why this exists:** LIBRE list screen and burn-date helpers need **read** access to prior submissions without a second on-device store for “have I completed LIBRE?” / injury date. Trade-off: behaviour depends on **`GET` being deployed and aligned** with this shape; graceful degradation is **intentional but asymmetric** (see §22: list vs runner).

#### POST `/form-responses`

```
 {
   form_id: string          // example: "burn_intake_v1"
   answers: Record<string,unknown> // collected patient answers keyed by question id
 }
```

### 14.4 Error surface mapping (`readErrorMessage`)

Structured parse order for response body (`api.ts`): `message`, `Message`, `error`, `detail`; else truncate raw body.

HTTP-specific canned fallbacks:

```
 401 -> "...sign-in may have expired..."
 400 -> "...required fields..."
 403 -> "...permission..."
 else -> generic numbered error
```

### 14.5 Reachability class (`explainReachabilityError`)

Detects substring families: **`failed to fetch`**, **`network request failed`**, **`load failed`**, **`network error`** → rewritten copy including web-specific guidance when **`Platform.OS==='web'`** (helps distinguish TLS/CORS/offline scenarios from application JSON errors).

### 14.6 Cross-origin note (web)

Native apps call API directly → no browser CORS. Web static bundles require **`Access-Control-Allow-*`** correctness on OPTIONS/POST for Bearer calls; troubleshooting belongs in infra runbook referencing this coupling.

---

## 15. Onboarding domain model

### 15.1 Form catalogue

```
 +--------------------------+---------------+-------------------------------+
 | form_id                   | Audience      | Notes                         |
 +--------------------------+---------------+-------------------------------+
 | patient_onboarding_v1    | Patient       | name + hospital picker        |
 | doctor_onboarding_v1      | Doctor        | Adds title specialty dept     |
 | burn_intake_v1           | Patient       | Sections → aggregated answers|
 +--------------------------+---------------+-------------------------------+
```

### 15.2 Burn intake sections (ordered list)

```
 01 about_you           demographics + anthropometrics (+ pregnancy selector)
 02 injury_details       timing, mechanism tiers, exposures, consciousness tier
 03 affected_areas       body map multi-select tiers, sizing
 04 symptoms             pain scale, wound perception multi, free text symptom
 05 first_aid            actions checklist, timelines, OTC meds narrative
 06 medical_history      chronic checklist, meds, allergies, tetanus, smoking
 07 consent               boolean confirmations (share req, research opt.)
```

Conditional visibility leverages **`dependsOn`** evaluated in **`question-visibility.ts`**.

### 15.3 Review persistence matrix

```
 Actor   | POST /me fields              | POST /form-responses
--------+--------------------------------+--------------------------
 Patient | name,hospital_id              | YES burn_intake_v1 aggregated
 Doctor | +title,specialty,department when present | NO (today)
```

### 15.4 Post-submit routing

Figure 15-1. **Review submission outcome**

```
                 +---------------+
 Review submit--> | validations OK |
                 +-------+-------+
                         |fail -> toast remain
                         v success
                   createMe(...)
                         |
 Patient path -----------+-------- Doctor path (skip intake POST)
                         v                    v
                 submitFormResponse()    afterSaveNavigate only
                         |
                         +------> PostAuth.refetch()
                         |
                         replace("/(app)" or "/(app-doctor)")
```

---

## 16. Presentation layer

### 16.1 Tab structure (patient) — nomenclature

```
 +--------+   +---------------+    +------------------+
 |  Home   | | Care programs |  | Facility identity |
 +--------+   +---------------+    +------------------+
   Ionicons grid / reader / person-circle (outline vs filled)
 Bottom safe-area compensated bar height adaptive (iOS vs Android elevations)
```

### 16.2 Theme artifacts

Tokens: `colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, **`fontFamily.ts`**, aggregator `theme/index.ts`.
Typography uses **Inter** via `@expo-google-fonts/inter` loaded in **`FontsProvider`**.

Representative composites: **`Screen`**, **`PageHeader`**, **`Button`**, **`Card`**, **`FormRenderer`** + **`HospitalPickerField`** (backed by `constants/hospitals.ts`).

### 16.3 Motion notes

Root Stack uses **`Platform.select`** animation descriptors (iOS `default` durations ~380 ms vs others `ios_from_right`).

Patient tabs use **`animation: shift`** timing ~295 ms bezier **`(0.25, 0.1, 0.25, 1)`**.

Landing → `(auth)` uses **`fade_from_bottom`** softened transition (**`landingToAuthPresentation`** constant block).

---

## 17. Operational characteristics

### 17.1 Logging taxonomy (`bxLog(tag, …)`)

```
 Tag examples (non-exhaustive):
   session       token refresh decoded role milestones
   postAuth      bootstrap / refetch
   api           request + response statuses (includes getMyFormResponses)
   cognito       Cognito failures
   nav           pathname + expo segments
   gate          RootNavigator visible stack classification
   form          Login / signup submits
   libre         LIBRE runner gate failures (see §22)
```

Enablement gate (`debug-log.ts`):

```
 __DEV__ === true               -> always logs
 OR EXPO_PUBLIC_BURNX_DEBUG=1 -> logs even outside dev (USE CARE: never secrets)
```

### 17.2 NPM scripts inventory

```
 start        expo start                 (dev server)
 ios|android|web   expo start --<plat>
 build        expo export                (production static/web pipeline hook)
 lint         eslint app src aws-config.ts
 proxy:api    node scripts/dev-api-proxy.js    **FILE CURRENTLY MISSING IN REPO — script entry orphan**
```

Action item tracked in Risks (**§20**).

---

## 18. Security considerations (client-bound)

Threat-oriented summary (design-time checklist — not penetration test conclusions):

```
 +----+----------------------------------------+---------------------------------------+
 | ID | Topic                                  | Implementation posture                |
 +----+----------------------------------------+---------------------------------------+
 | S1 | Token theft (device compromise)       | Prefer native builds; minimise web PHI |
 | S2 | XSS on web steals localStorage JWT    | Sanitisation & CSP infra responsibility|
 | S3 | MITM                                   | HTTPS only; pinning not implemented    |
 | S4 | Token tampering (local edit)           | Unsigned decode; useless if API rejects|
 | S5 | Stale identities after Cognito delete | Post-auth + route helper sign-outs     |
 +----+----------------------------------------+---------------------------------------+
```

JWT decode **does not** verify signature (**by design shortcut**); correctness depends on **`Authorization`** acceptance at API authorizer aligned with issuer.

Exposure: **`COGNITO.clientId`** and pool IDs embedded — treat as non-secret identifiers; rotate via config change pipelines if compromised.

---

## 19. Quality attributes and non-functional requirements

### 19.1 Portability matrix (declared targets)

```
 +--------------+--------+---------+------------------------+
 | Surface      | Status | Notes   | Blocking tech deps     |
 +--------------+--------+---------+------------------------+
 | iOS / iPadOS | Tier-1 | Notch / safe areas via lib     | Gesture handler, tabs |
 | Android edge | Tier-1 | predictiveBackGesture false    | Reanimated compat     |
 | Web static   | Tier-2 | Reachability+CORS caveat       | localStorage weaker   |
 +--------------+--------+---------+------------------------+
```

### 19.2 Accessibility posture (engineering intent)

Screens use React Native primitives; explicit **`accessibilityLabel`** appears on loading indicators (**review** spinner). Dedicated WCAG conformance statement not automated in repo—flag for QA backlog.

### 19.3 Performance tactics (implicit)

Animated transitions leverage Reanimated; avoid blocking JS on onboarding large forms validation batch on review (**validateQuestions**) single pass — monitor if answer map grows materially.

---

## 20. Risks, gaps, and follow-up work

```
 ID  Severity Area                 Description                                   Mitigation
 --  --------- ----                 -----------                                   ----------
 R-1 MEDIUM    Developer ergonomics Missing dev-api-proxy.js despite npm alias   Remove script OR add compliant proxy+CORS README
 R-2 MEDIUM    Doctor product       Scaffold shell lacks parity feature depth     Product roadmap prioritisation
 R-3 HIGH      PHI / compliance     Clinical text stored client until POST        Transport-only; organisational BAAs/policies external
 R-4 LOW       Config drift       Cognito hard-coded in aws-config.ts            Extract EXPO_PUBLIC_ env for multi-env
 R-5 MEDIUM    LIBRE / API         **`GET /form-responses`** not deployed → list shows assignments while runner may mis-gate | Ensure API+authorizer in all envs; monitor 404/403 on GET (see §22)
 R-6 LOW       LIBRE UX           In-progress answers live in **component state** only | App kill / process death loses draft; accept or add persistence (product call)
```

---

## 21. Appendices

### Appendix A — Local persistence keys (`storage.ts`)

```
 accessToken       Cognito Access token string
 idToken           Cognito Id token JWT string (role claims)
 refreshToken      Long-lived Cognito refresh
 tokenExpiresAt    Epoch millis string for proactive refresh cutoff
 (+ pending signup artefacts if present—see pending-signup-password.ts)
```

### Appendix B — Operational flow: **replaceRouteAfterAuthentication()**

Rough decision tree aligning with **`post-auth`** semantics:

```
 read role from JWT
   none -> profile-creation
 getMe fails (network/application) -> profile-creation
 needs onboarding flag -> profile-creation
 done + doctor -> (app-doctor)
 done + patient -> (app)
 any unexpected thrown -> profile-creation fallback
```

### Appendix C — User journey timelines (ASCII)

Patient first-run condensed:

```
 0----+ Landing +----+ SignUp +----+ ConfirmEmail +----+ SignIn +
      |__________________________________________________________|
                                                                +----+ Profile Creation +----+ Intake Sections (N) +
                                                                                              |________________________________|
                                                                                                                               +----+ Review/submit +
                                                                                                                                    |_______________|
                                                                                                                                                        +----+ App Tabs +---->
```

Doctor first-run condensed:

```
 0----+ SignUp(doctor)+----+ Confirm +----+ Login +----+ Profile clinician form +----+ Review POST /me +
                                                                                                           |_______________|
                                                                                                                              +----+ Doctor Home Stack +-->
```

### Appendix D — Glossaries extension

```
 Stack.Protected — expo-router pattern gating subtree mount by predicate
 onboarding_completed — server boolean on user profile row authoritative for shell routing
 Reachability errors — subclass of failures without HTTP status (TCP/DNS/browser CORS)
 LIBRE — Longitudinal-style QoL questionnaire flow in Care programs (`libre_v1` in code)
 libre_v1 — `form_id` for the definition in `src/constants/forms/libre.ts`
 psqi_v1 — `form_id` for PSQI in `src/constants/forms/psqi.ts`
 pain_intensity_v1 — daily pain check-in in `src/constants/forms/pain-intensity.ts` (**`assignmentDailyLocalStart`**: 18:30 local / device TZ; new period each calendar day at that wall time)
 consent_v1 — study agreement `form_id`; version bumps re-prompt (`src/constants/forms/consent.ts`)
 firstUnansweredVisible — `form-engine.ts`: next visible question without an answer (`showIf` respected)
```

### Appendix E — Compatibility & upgrade checklist template

Organisations may instantiate:

```
 [ ] Bump Expo SDK + align peer deps Matrix from Expo changelog
 [ ] Regression: signup flow both roles sandbox pool
 [ ] Regression: onboarding offline -> explainReachabilityError copy QA
 [ ] Security: JWT authorizer rejects tampered signatures on staging
 [ ] LIBRE: `GET /form-responses?form_id=libre_v1` returns 200 for authed patient in staging
 [ ] Consent: modal flow + `GET/POST form-responses` with `consent_v1`
```

---

## 22. Engineering transparency — LIBRE, read API & design trade-offs

This section records **why** the LIBRE slice was built the way it is, what was explicitly **not** solved in the first pass, and which **dependencies** were touched. It is not a product promise; it mirrors the code as of the revision that introduced **`libre_v1`**, **`getMyFormResponses`**, **`app/(app)/forms/`**, **weekly `assignmentCadenceDays`**, and **daily-local `assignmentDailyLocalStart`** (pain intensity) for recurring instruments.

### 22.1 Motive (problem statement)

- **Care programs** needed a second assignable patient flow beside burn intake: a compact, scale-based PROM-style questionnaire with neutral progress indication and explicit completion confirmation (no gamification).
- **Server remains source of truth** for the latest submission **`created_at`** per **`form_id`**; the client decides **pending vs satisfied** using optional **`assignmentDailyLocalStart`** (takes precedence) or **`assignmentCadenceDays`** (**`src/lib/form-assignment-eligibility.ts`**).

### 22.2 Chain of thought (design sequence)

1. **Data model first (client types):** `LIBRE_FORM`, **`PSQI_FORM`**, **`PAIN_INTENSITY_FORM`**, and answer maps live in **`src/constants/forms/libre.ts`** / **`psqi.ts`** / **`pain-intensity.ts`** and **`types.ts`** (**`ScaleQuestionnaireForm`**), registered in **`src/constants/forms/index.ts`** (`ALL_FORMS`, `getFormById`) so the list screen can render assignable rows without importing deep paths everywhere. Optional **`assignmentDailyLocalStart`** (`hour` / `minute`, device timezone) marks an assignment **pending** when there is no submission **or** the latest **`created_at`** falls **before** the start of the current local period (Pain intensity: **18:30** daily boundary). Elsewhere optional **`assignmentCadenceDays`** re-opens after **N whole days** since the latest **`created_at`** (**LIBRE** and **PSQI** use **7**).
2. **Visibility logic isolated:** Conditional questions use **`showIf`**; **`src/lib/form-engine.ts`** computes **`firstUnansweredVisible`**, **`prevVisibleQuestionId`**, and **`progressMeta`** so UI files stay thin.
3. **Routing:** A **folder** **`app/(app)/forms/`** with **`_layout.tsx` `Stack`** allows pushing **`[formId]`** inside the **Care programs** tab without colliding with a single-file **`forms.tsx`** pattern and without leaving the tab shell.
4. **Read path:** **`getMyFormResponses`** filters by **`form_id`** and **`limit`** so **`burn-date.ts`** can ask “latest **`burn_intake_v1`** injury date” and “latest completion” for **`libre_v1`**, **`psqi_v1`**, etc., with small payloads.
5. **Assignment eligibility:** **`resolveAssignmentSnapshot(formId)`** combines **`getBurnInjuryDate`** + **`getLastCompletion(formId)`**. If **`assignmentDailyLocalStart`** is set, **pending** when never submitted **or** **`last_created_at <` current period start** (latest local **`{hour,minute}`** at or before **`now`**). For **`assignmentCadenceDays`** only, **pending** when never submitted **or** **`now ≥ last_created_at + N days`**. Omit both on future catalogue rows for legacy **one-shot** behaviour (**pending** only when no row).
6. **Local cache:** **`src/lib/form-assignment-cache-storage.ts`** — **`assignment_last_completed:{jwt_sub}:{form_id}`**. After successful **GET**, snapshot writes server **`created_at`** for cadence- and daily-local-enabled forms; after successful **POST**, **`persistAssignmentSubmissionClientTime`** writes **`Date.toISOString()`** so Assignments updates without waiting for refetch. **`auth.signOut`** ( **`src/lib/auth.ts`** ) deletes all keys for the current **`sub`** via **`clearAssignmentCachesForSub`** **before** tokens are cleared — avoids stale keys for another user on the shared device.
7. **Recall chip copy:** **`buildFormRecallPeriodLabel`** (`burn-date.ts`) — “Since your burn injury (date)” when there is no prior submission for this `form_id`, otherwise “In the last N days” from `lastCompletedAt` → now. Shown via **`FormRecallPeriodChip`**. The deprecated alias **`buildBurnHeader`** calls the same helper.

### 22.3 Trade-offs (accepted limitations)

| Topic | Choice | Consequence |
|-------|--------|-------------|
| Draft persistence | Answers in **`useState`** on **`[formId].tsx`** | Process kill or force-quit **loses in-progress** LIBRE; user restarts from first visible question. |
| List screen + GET failure | **`app/(app)/forms/index.tsx`**: **`useFocusEffect`** runs **`resolveAssignmentSnapshot(f.id)`** per catalogue row; **`catch` per form pushes the row as pending**; snapshot also yields **`pending: true`** internally on fetch failure | Conservative: failed GET still shows the assignment. |
| Runner + GET failure | **`[formId].tsx`** boot: **`resolveAssignmentSnapshot`** → **`pending: true`** on failure, so the runner still opens | If server already has a row but GET fails, user may submit again — **backend idempotency not assumed** on the client. |
| Injury / completions | Derive from GET (`burn-date.ts` helpers inside **`resolveAssignmentSnapshot`**) | Cache mirrors **`created_at`** after GET **and client `toISOString()` after successful POST**. GET failure ⇒ **`pending: true`**. Wrong device clock vs server `created_at` can surface assignments early/late (MVP) — backlog **§22.5**. |
| JWT on client | **`jwt.ts`** decodes payload **without signature verify** for UI routing | Same posture as earlier BurnX docs: **authorization is API-side**; client decode is convenience only. |
| Dependencies | **No new npm packages** for LIBRE | Reuses **`expo-router`**, **`@react-navigation/native`** (`useFocusEffect`), **`submitFormResponse`** / **`authFetch`**. **`FormProgress`** uses **`react-native-reanimated`** for the progress bar only. Tokens use **`expo-secure-store`** (native) / **`localStorage`** (web) via **`storage.ts`**. |

### 22.4 Implementation map (files)

| Concern | Location |
|---------|----------|
| Route stack + list | **`app/(app)/forms/_layout.tsx`**, **`index.tsx`** |
| Runner | **`app/(app)/forms/[formId].tsx`** (catalogue `formId`; unknown id → message + back) |
| Form definition | **`src/constants/forms/libre.ts`**, **`psqi.ts`**, **`pain-intensity.ts`**, **`types.ts`**, registry **`index.ts`** |
| Engine | **`src/lib/form-engine.ts`** |
| API read/write | **`src/lib/api.ts`** — **`getMyFormResponses`**, **`submitFormResponse`**, **`FormResponse`** |
| Derived dates / header | **`src/lib/burn-date.ts`** |
| Assignment cadence + cache | **`src/lib/form-assignment-eligibility.ts`** — **`resolveAssignmentSnapshot`**, **`isDueForCadence`**, **`isDueForDailyLocalWindow`**, **`getCurrentDailyPeriodStartMs`**, **`persistAssignmentSubmissionClientTime`** |
| Cache key hygiene + purge on sign-out | **`src/lib/form-assignment-cache-storage.ts`** · **`clearAssignmentCachesForSub`** invoked from **`src/lib/auth.ts`** **`signOut`** |
| JWT **`sub`** for cache keys | **`src/lib/jwt.ts`** — **`getSubjectFromStoredIdToken`** |
| UI primitives | **`src/components/forms/`** — **`FormProgress`**, **`ScaleQuestion`** |

### 22.5 Backlog — eligibility timing telemetry (non-blocking)

| Item | Notes |
|------|--------|
| Clock skew / **`Date`** header | Optionally anchor “now” to server time for **`isDueForCadence`** — CloudWatch metric on **`|client_minus_server_ms|`**. |

### 22.6 Packages (explicit)

Completion is communicated with a **`Alert.alert`** confirmation (no gamification); user returns to **`/forms`** explicitly. **`FormProgress`** still uses **`react-native-reanimated`**. Tokens remain on **`expo-secure-store`** (native) / **`localStorage`** (web) via **`storage.ts`** — orthogonal to questionnaire draft state.

---

*End of document. Navigation index:* [BurnX-Technical-Documentation README](./README.md)

---
name: EMA triple-strike notifications
overview: "Grouped expo-notifications from GET /form-schedule (7-day); strike cancellation + today's sync skips use GET /form-responses completions (calendar bucket). GET /me/assignments secondary (telemetry snapshot). Toast & home EMA counts use resolveAssignmentSnapshot / resolveEmaAssignmentPending (getLastCompletion), not Dynamo submissions map."
todos_shipped_v1:
  - id: deps-expo-notifications
    content: expo-notifications + app.json plugin
  - id: ema-copy
    content: >-
      ema-copy.ts — EMA_NOTIF_COPY, EVENING_STRIKE_HEADS; pickCopyIndex (day-of-year + slot ordinal salt),
      noonLocalDateFromYmd, slotTimeLabel, firstNameFromMeName
  - id: api-form-schedule-assignments
    content: >-
      api.ts — getFormSchedule (GET /form-schedule), getMeAssignments (GET /me/assignments),
      normalizeAssignmentsSubmissions
  - id: notifications-engine
    content: >-
      notifications-engine.ts — syncSchedule (7-day, fallback schedule on GET failure),
      refreshSchedules (native: completions kill-switch independent of Dynamo success; GET /me/assignments optional return snapshot), emaOutstandingMatchesAssignmentsUi (toast)
      cancelStrikeTripletForSlot/cancelAuditStrike, optional test preview helper
  - id: bootstrap-routing
    content: >-
      PatientEmaNotificationBootstrap — sync → **`refreshSchedules`**; toast uses **`emaOutstandingMatchesAssignmentsUi`** (same **`resolveAssignmentSnapshot`** ×3 as Assignments/home EMA rows). **`assignmentsSnapshot` state gates effect timing only, not Dynamo truth. Cold-start tap route;
      ToastProvider actionable toast → /forms; foreground refreshSchedules debounce 60s
  - id: forms-post-submit
    content: >-
      forms/[formId].tsx — after successful EMA submit: clearEmaScheduleCache,
      refreshSchedules, cancelAuditStrike
  - id: ui-home-assignments
    content: >-
      Home EmaHomeSection; forms/index + eligibility resolvers — toast **`pending`** matches **`resolveAssignmentSnapshot`** for **`ema_*`** (not raw Dynamo snapshot alone).
  - id: verify
    content: tsc --noEmit + eslint on touched paths
---

# EMA triple-strike notifications — **as implemented**

This doc matches the **current codebase** (`notifications-engine.ts`, API client, bootstrap, copy). Older drafts that assumed **`form_id`** per slot or RNG copy are superseded.

## Dependencies

[`package.json`](../../package.json): **`expo-notifications`**; [`app.json`](../../app.json): notifications plugin entry (as configured in repo).

---

## Lambda / schedule shape (**GET /form-schedule**)

Each slot has **`form_ids: string[]`**, **`slot_id`**, **`local_open_time` / `local_close_time`**, **`n1_utc` … `n3_utc`**.

- **`morning_slot`**: `["ema_sleep_quality_v1"]`
- **`evening_slot`**: `["ema_pain_now_v1","ema_mood_v1"]`

TypeScript lives in **`src/lib/ema-schedule-types.ts`** (`FormScheduleSlot` uses **`form_ids`**).

---

## Strikes per slot (**3 + shared audit**)

- **Rolling 7 calendar days**: For each **`offset` 0…6**, we call **`getFormSchedule({ date: localYmd(+offset), tz_offset_min })`**. Each slot schedules up to three **`DATE`** triggers at **`n1_utc`, `n2_utc`, `n3_utc`** (skipped if parsing fails or fire time **`≤ now`** at **`syncSchedule`** time).

### Notification identifiers

- Strikes: **`strike-{1|2|3}-{slot_id}-{scheduleDateYmd}`** — e.g. `strike-2-evening_slot-2026-05-08`.
- Audit (today-only / **`offset === 0`**): **`strike-audit-today`** at **`n4_audit_utc`** if that instant is **`> now`**.
- **`syncSchedule`** starts with **`cancelAllScheduledNotificationsAsync()`**, so identifiers are stable relative to **`scheduleDateYmd`**, not “wall clock mutate”.

### Payload (`content.data`)

- **`kind`**: **`ema_strike`** | **`ema_audit`** (and **`test_preview`** for QA-only local preview).
- **`href`**:
  - Single-form slot **`→ /forms/{form_ids[0]}`**
  - Multi-form **`→ /forms`**

---

## Copy (**deterministic modulo**, not RNG for strikes)

Implemented in **`src/constants/ema-copy.ts`** alongside **`src/lib/notifications-engine.ts`** helpers:

- **Strike 1**: morning uses **`INVITE_MORNING_SINGLE`** + optional first-name suffix; evening uses **`EVENING_STRIKE_HEADS`** × **`INVITE_EVENING_MULTI`**.
- **Strike 2 / 3**: **`GUILT`** / **`LOSS`** pools.
- **Audit**: **`AUDIT`** pool.
- Pool index:** `pickCopyIndex(poolLength, slotKey, noonLocalDate)`** — local **day-of-year** plus **slot ordinal salt** so morning/evening rarely collide on guilt text same day.

**First name**: **`GET /me`** via **`getMe()`** → **`firstNameFromMeName(me?.name)`**.

---

## **`GET /me/assignments`** (telemetry snapshot — **not** EMA UX source of truth)

**[`getMeAssignments()`](../../src/lib/api.ts)** returns **`{ submissions: Record<string, string | null> }`**. **`normalizeAssignmentsSubmissions`** coerces odd shapes to **`null`**.

Local **`submissionsDone(submissions, formId)`**: **`true`** when value is non-empty trimmed string — **logged beside completions kill-switch** for debugging-only comparisons.

### Resolver → data (single story: **`GET /form-responses`** completions + slot calendar)

| Surface | Mechanism |
| --- | --- |
| **Toast** | **`emaOutstandingMatchesAssignmentsUi`** → **`resolveAssignmentSnapshot`** ×3 (**`ema_*`**) → **`getLastCompletion`** + slot windows (**`resolveEmaAssignmentPending`**) |
| **Home metric + Daily check-ins rows** (**`fetchDashboardAws`**) | **`resolveEmaAssignmentPending`** per EMA (**`getLastCompletion`**) |
| **Assignments** | **`resolveAssignmentSnapshot`** (same EMA pathway) |
| **`refreshSchedules` strike cancellation (native)** | **`emaKillSwitchFlagsForScheduleDate`** (**`getLastCompletion` ×3**, local calendar **`YYYY-MM-DD`**) — **applied even if Dynamo GET fails** |
| **`syncSchedule` (offset 0)** | Skips today morning/evening strikes + audit when kill-switch reports done |

**`fetchEmaOutstandingFromAssignmentsSnapshot(submissions)`** — legacy Dynamo-only predicate; **strikes no longer keyed off it** (**`refreshSchedules`**).

**`emaOutstandingMatchesAssignmentsUi()`** ORs **`resolveAssignmentSnapshot`** for the three **`ema_*`** **`pending`** flags — gates **toast** (same **`pending`** as Assignments/home when network healthy).

---

## **`src/lib/notifications-engine.ts`** (inventory)

### **`syncSchedule()`**

- **Web**: no-op early return.
- Requests notification permission when needed; **`ensureAndroidChannel`**, then **`cancelAllScheduledNotificationsAsync()`**.
- For each of **7 days** from local today (`ema-schedule-fallback` helpers **`localCalendarYmd`**, **`addDaysToYmd`**):
  - Try **`getFormSchedule`**; **`catch`** → **`buildFallbackFormSchedule(ymd)`** (**client mirror** when API unreachable — strikes still approximate slot times locally).
  - **`offset === 0`**: skip **`morning_slot` / `evening_slot`** strikes when **`emaKillSwitchFlagsForScheduleDate(sched.date)`** says that bucket satisfied; skip **audit** when **allDone**.
  - Schedule remaining strikes **`scheduleStrike`** and day-0 audit if not skipped above.

### **`refreshSchedules()`**

- **Native**: first **`emaKillSwitchFlagsForScheduleDate(localCalendarYmd())`** ⇒ **`cancelStrikeTripletForSlot` / `cancelAuditStrike`** (from **`GET /form-responses`**, not Dynamo).
- Then **`GET /me/assignments`** once; returns **`submissions`** or **`null`** if GET throws (**kill-switch already ran**).
- **Web**: only the GET (**strikes native-only**).

### **`emaOutstandingMatchesAssignmentsUi()`**

- Parallel **`resolveAssignmentSnapshot`** for **`ema_sleep_quality_v1`**, **`ema_pain_now_v1`**, **`ema_mood_v1`**; **`true`** if any **`pending`** — gates **toast**.

### **`fetchEmaOutstandingFromAssignmentsSnapshot(submissions)`**

- Dynamo-only **`pending`** heuristic — **strikes bypass it**; reserved for ancillary callers/tests.

### **`cancelStrikeTripletForSlot` / `cancelAuditStrike`**

Exported helpers for cancelling by slot id/date or **`strike-audit-today`**.

### **`ensureNotificationPresentationConfigured`**

Registers **`Notifications.setNotificationHandler`** (banner/list/sound) once.

---

## **`src/components/PatientEmaNotificationBootstrap.tsx`**

Mounted from **[`app/(app)/_layout.tsx`](../../app/(app)/_layout.tsx)** beside patient tabs (**not** only root `app/_layout.tsx`).

1. **`ensureNotificationPresentationConfigured()`** immediately.
2. **Mount pass** (`useEffect`): **`syncSchedule()`** (native only) → **`refreshSchedules()`** → store **`assignmentsSnapshot`** (**timing only**) → native cold-start **`getLastNotificationResponseAsync`** **`router.push`** when **`kind`** matches.
3. **Pending EMA toast** (`useEffect`): when **`role === 'patient'`** and mount **`refreshSchedules`** has finished (**`assignmentsSnapshot !== undefined`**), **`await emaOutstandingMatchesAssignmentsUi()`** → **`showToast`** if any EMA snapshot **`pending`** (extra **`GET /form-responses`** via resolver paths).
4. **`addNotificationResponseReceivedListener`** for warm taps (**same **`readRoutableNotificationHref`**).
5. **`AppState`**: **`inactive|background → active`** ⇒ **`refreshSchedules()`** only if **≥ 60 s** since last foreground refresh (**second GET only on foreground cadence**, not duplicate on same mount).

---

## **`app/(app)/forms/[formId].tsx`**

After successful **`submitFormResponse`**:

- **`isEmaFormId`** ⇒ **`clearEmaScheduleCache()`**, **`refreshSchedules()`**, **`cancelAuditStrike()`**.

So audit is canceled on **every** successful EMA submit (not gated on assignments empty-state beyond that).

---

## Related UI (optional context)

- **Home**: **`EmaHomeSection`** + **`openQuestionnaires`** — **`resolveEmaAssignmentPending`** and **`getLastCompletion`**, aligned with **`emaOutstandingMatchesAssignmentsUi`** (slot window + completions).
- **Assignments**: **[`app/(app)/forms/index.tsx`](../../app/(app)/forms/index.tsx)** orders EMA trio and uses assignment snapshot resolver.

---

## Manual QA checklist (aligned with behavior)

- Re-run **`syncSchedule`** twice same calendar day ⇒ same modulo lines for **`scheduleDateYmd`**.
- **`GET /me/assignments`** sparse / **`submissions`** without EMA keys ⇒ **strike cancellation unchanged** (**`refreshSchedules`** uses **`GET /form-responses`** first on native).
- Sleep submitted ⇒ next **`refreshSchedules`** (**or **`syncSchedule`** re-run**) clears relevant triplets via **`completionLocalYmd === today`** semantics.
- Offline **`GET /me/assignments`** → **`refreshSchedules`** returns **`null`** — **native kill-switch still cancels strikes** when **`GET /form-responses`** reachable.
- **`/form-schedule`** failure ⇒ **`syncSchedule`** still emits strikes from **`buildFallbackFormSchedule`** (documented divergence from Dynamo until network returns).

---

## Supersedes

Earlier plan slug **`ema_triple-strike_notifications_dfc27a5a`** and any draft stating **RNG copy**, **`form_id`** (singular) per slot, **`app/_layout.tsx`**‑only bootstrap, or **client eligibility fallback for open-app notifications**.

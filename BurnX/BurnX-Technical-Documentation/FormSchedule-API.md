# GET /form-schedule — EMA slot contract

Patient-scoped endpoint used by the NeoTherm client for EMA eligibility windows and local open notifications.

## Request

```
GET /form-schedule?date=YYYY-MM-DD&tz_offset_min={minutes}
```

| Parameter | Description |
|-----------|-------------|
| `date` | Calendar day in the patient's local timezone (`YYYY-MM-DD`). |
| `tz_offset_min` | Patient device offset from UTC in minutes (same convention as JavaScript `Date.getTimezoneOffset()` negated). |

## Response

```json
{
  "date": "2026-05-26",
  "slots": [
    {
      "slot_id": "sleep_am",
      "form_ids": ["ema_sleep_quality_v1"],
      "local_open_time": "09:00",
      "local_close_time": "23:59",
      "n1_utc": "2026-05-26T13:00:00.000Z"
    },
    {
      "slot_id": "pain_am",
      "form_ids": ["ema_pain_now_v1"],
      "local_open_time": "11:00",
      "local_close_time": "23:59",
      "n1_utc": "2026-05-26T15:00:00.000Z"
    },
    {
      "slot_id": "pain_pm",
      "form_ids": ["ema_pain_now_v1"],
      "local_open_time": "20:00",
      "local_close_time": "23:59",
      "n1_utc": "2026-05-26T00:00:00.000Z"
    },
    {
      "slot_id": "mood_noon",
      "form_ids": ["ema_mood_v1"],
      "local_open_time": "12:00",
      "local_close_time": "23:59",
      "n1_utc": "2026-05-26T16:00:00.000Z"
    },
    {
      "slot_id": "mood_night",
      "form_ids": ["ema_mood_v1"],
      "local_open_time": "22:00",
      "local_close_time": "23:59",
      "n1_utc": "2026-05-26T02:00:00.000Z"
    }
  ]
}
```

## Slot definitions (patient local time)

| `slot_id` | `form_ids` | Opens | Closes |
|-----------|------------|-------|--------|
| `sleep_am` | `ema_sleep_quality_v1` | 09:00 | 23:59 |
| `pain_am` | `ema_pain_now_v1` | 11:00 | 23:59 |
| `pain_pm` | `ema_pain_now_v1` | 20:00 | 23:59 |
| `mood_noon` | `ema_mood_v1` | 12:00 | 23:59 |
| `mood_night` | `ema_mood_v1` | 22:00 | 23:59 |

Each slot is **single-form** (`form_ids` length 1). Pain and mood appear twice per day as separate slots.

## Field semantics

| Field | Required | Notes |
|-------|----------|-------|
| `date` | yes | Must match the requested `date` query param. |
| `slots` | yes | Array of five slots (order not significant). |
| `slot_id` | yes | Stable identifier; client uses it for notification ids and kill-switch. |
| `form_ids` | yes | Single instrument id per slot. |
| `local_open_time` | yes | `HH:MM` 24-hour local time when the form becomes available. |
| `local_close_time` | yes | Always `"23:59"` — form closes at end of calendar day. |
| `n1_utc` | yes | ISO-8601 UTC instant when the open notification should fire (= slot open in patient local time). |
| `n2_utc`, `n3_utc` | no | **Legacy — omit.** Client schedules one notification per slot (`n1_utc` only). |
| `n4_audit_utc` | no | **Legacy — omit.** End-of-day audit reminders removed. |

## Client behavior

1. **Eligibility** — A form is pending when `now` is inside a slot window `[local_open_time, 23:59]` and no submission for that form exists with `created_at` inside that slot window on `date`.
2. **Notifications** — Client schedules one local notification per slot at `n1_utc` for the next 7 calendar days. Cancels a slot's notification when that slot is satisfied.
3. **Fallback** — If GET fails, client builds the same five slots locally (`src/lib/ema-schedule-fallback.ts`).

## Lambda migration checklist

- [ ] Replace grouped slots (`morning_slot`, `midday_slot`, `evening_slot`) with five single-form slots above.
- [ ] Set all `local_close_time` values to `"23:59"`.
- [ ] Emit **`n1_utc` only** at each open time; stop emitting `n2_utc`, `n3_utc`, `n4_audit_utc`.
- [ ] Use stable `slot_id` strings so client notification cancellation keys match.

## Related client files

- Types: `src/lib/ema-schedule-types.ts`
- Fallback schedule: `src/lib/ema-schedule-fallback.ts`
- Slot windows: `src/lib/ema-slot-windows.ts`
- Eligibility: `src/lib/ema-assignment-eligibility.ts`
- Notifications: `src/lib/notifications-engine.ts`

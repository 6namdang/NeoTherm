import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  firstNameFromMeName,
  noonLocalDateFromYmd,
  openNotificationBody,
} from "../constants/ema-copy";
import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "../constants/ema-forms";
import { getMe, getMeAssignments } from "./api";
import { bxLog } from "./debug-log";
import { fetchFormScheduleForDate } from "./ema-schedule-loader";
import {
  addDaysToYmd,
  localCalendarYmd,
} from "./ema-schedule-fallback";
import type { FormScheduleSlot } from "./ema-schedule-types";
import {
  emaAnyPendingFromState,
  loadTodayEmaState,
  slotSatisfiedFromState,
} from "./ema-today-state";

let notificationPresentationHandlerInstalled = false;

export function ensureNotificationPresentationConfigured(): void {
  if (notificationPresentationHandlerInstalled) return;
  notificationPresentationHandlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const ANDROID_DEFAULT_CHANNEL = "burnx_default";

function noopChannelTrigger<T extends Notifications.NotificationTriggerInput>(
  trigger: T,
): T {
  if (Platform.OS !== "android") return trigger;
  if (trigger && typeof trigger === "object" && "type" in trigger) {
    return { ...trigger, channelId: ANDROID_DEFAULT_CHANNEL };
  }
  return trigger;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function hrefForSlot(slot: FormScheduleSlot): `/forms/${string}` {
  return `/forms/${slot.form_ids[0] ?? "daily"}`;
}

function submissionsDone(
  submissions: Record<string, string | null>,
  formId: string,
): boolean {
  const v = submissions[formId];
  return typeof v === "string" && v.trim() !== "";
}

/** Matches **`refreshSchedules`** pending semantics — any EMA instrument incomplete in an open slot. */
function emaOutstandingFromAssignmentsSubmissions(
  submissions: Record<string, string | null>,
): boolean {
  const sleepPending = !submissionsDone(submissions, EMA_SLEEP_FORM_ID);
  const painPending = !submissionsDone(submissions, EMA_PAIN_FORM_ID);
  const moodPending = !submissionsDone(submissions, EMA_MOOD_FORM_ID);
  return sleepPending || painPending || moodPending;
}

/**
 * Pending EMA from Dynamo **`GET /me/assignments`** body — pure client-side, no **`GET /form-responses`**.
 * Useful only when you already hold a snapshots map; **`refreshSchedules`** uses slot-scoped completions instead.
 */
export function fetchEmaOutstandingFromAssignmentsSnapshot(
  submissions: Record<string, string | null>,
): boolean {
  return emaOutstandingFromAssignmentsSubmissions(submissions);
}

/**
 * **`pending`** for sleep / pain / mood matches **`resolveAssignmentSnapshot`** (Assignments UI + EMA windows +
 * **`GET /form-responses`** last completion). Use this for **toast** so we don't diverge when `/me/assignments`
 * is sparse, omits keys, or formats timestamps differently than the runner/list.
 */
export async function emaOutstandingMatchesAssignmentsUi(): Promise<boolean> {
  try {
    const state = await loadTodayEmaState();
    return emaAnyPendingFromState(state);
  } catch (caught) {
    bxLog(
      "notifications",
      "emaOutstandingMatchesAssignmentsUi failed; skipping toast",
      caught,
    );
    return false;
  }
}

function openNotificationIdentifier(slotId: string, dateYmd: string): string {
  return `ema-open-${slotId}-${dateYmd}`;
}

export async function cancelOpenNotificationForSlot(
  slotId: string,
  dateYmd: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(
    openNotificationIdentifier(slotId, dateYmd),
  );
}

/** @deprecated Use `cancelOpenNotificationForSlot`. */
export async function cancelStrikeTripletForSlot(
  slotId: string,
  dateYmd: string,
): Promise<void> {
  await cancelOpenNotificationForSlot(slotId, dateYmd);
}

/** @deprecated Audit reminders removed — no-op for callers. */
export async function cancelAuditStrike(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync("strike-audit-today");
}

async function scheduleOpenNotification(args: {
  slot: FormScheduleSlot;
  scheduleDateYmd: string;
  fireIso: string;
  firstName: string | null;
  nowMs: number;
}): Promise<void> {
  const { slot, scheduleDateYmd, fireIso, firstName, nowMs } = args;
  const formId = slot.form_ids[0];
  if (!formId) return;

  const t = Date.parse(fireIso);
  if (!Number.isFinite(t) || t <= nowMs) return;

  const when = noonLocalDateFromYmd(scheduleDateYmd);
  const body = openNotificationBody(formId, slot.slot_id, when, firstName);
  const href = hrefForSlot(slot);

  await Notifications.scheduleNotificationAsync({
    identifier: openNotificationIdentifier(slot.slot_id, scheduleDateYmd),
    content: {
      title: "NeoTherm",
      body,
      data: {
        kind: "ema_open",
        href,
      },
    },
    trigger: noopChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(t),
    }),
  });
}

/**
 * Full reschedule: one local open notification per EMA slot (7-day rolling window).
 */
export async function syncSchedule(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (!existing.granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) {
        bxLog("notifications", "syncSchedule aborted: permission denied");
        return;
      }
    }
  } catch (caught) {
    bxLog("notifications", "syncSchedule permission error", caught);
    return;
  }

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const nowMs = Date.now();
  const todayYmd = localCalendarYmd(new Date(nowMs));

  let firstName: string | null = null;
  try {
    const me = await getMe();
    firstName = firstNameFromMeName(me?.name);
  } catch {
    firstName = null;
  }

  let todayState: Awaited<ReturnType<typeof loadTodayEmaState>> | null = null;
  try {
    todayState = await loadTodayEmaState({ nowMs });
  } catch (caught) {
    bxLog("notifications", "syncSchedule today state load failed", caught);
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const ymd = addDaysToYmd(todayYmd, offset);
    let sched;
    try {
      sched = await fetchFormScheduleForDate(ymd);
    } catch (caught) {
      bxLog("notifications", "syncSchedule schedule fetch failed", {
        ymd,
        caught,
      });
      continue;
    }

    for (const slot of sched.slots) {
      if (offset === 0 && todayState) {
        try {
          if (slotSatisfiedFromState(slot, ymd, todayState)) continue;
        } catch (caught) {
          bxLog("notifications", "syncSchedule slot kill-switch failed", {
            slotId: slot.slot_id,
            caught,
          });
        }
      }

      const fireIso = slot.n1_utc;
      if (typeof fireIso !== "string" || fireIso.trim() === "") continue;

      await scheduleOpenNotification({
        slot,
        scheduleDateYmd: ymd,
        fireIso,
        firstName,
        nowMs,
      });
    }
  }

  bxLog("notifications", "syncSchedule completed");
}

/**
 * Native: cancel open notifications for satisfied slots using **`GET /form-responses`** completions.
 * **`GET /me/assignments`**: secondary — returns **`submissions`** snapshot for bookkeeping / logging only.
 */
export async function refreshSchedules(): Promise<
  Record<string, string | null> | null
> {
  let satisfiedSlots: string[] | undefined;

  if (Platform.OS !== "web") {
    try {
      const today = localCalendarYmd();
      const todayState = await loadTodayEmaState();
      satisfiedSlots = [];

      for (const slot of todayState.schedule.slots) {
        if (slotSatisfiedFromState(slot, today, todayState)) {
          satisfiedSlots.push(slot.slot_id);
          await cancelOpenNotificationForSlot(slot.slot_id, today);
        }
      }

      bxLog("notifications", "refreshSchedules slot kill-switch", {
        scheduleDate: today,
        satisfiedSlots,
      });
    } catch (caught) {
      bxLog(
        "notifications",
        "refreshSchedules kill-switch (form-responses) failed",
        caught,
      );
    }
  }

  try {
    const { submissions } = await getMeAssignments();
    if (Platform.OS !== "web" && satisfiedSlots !== undefined) {
      bxLog("notifications", "refreshSchedules", {
        satisfiedSlots,
        dynamoEcho: {
          sleep: submissionsDone(submissions, EMA_SLEEP_FORM_ID),
          pain: submissionsDone(submissions, EMA_PAIN_FORM_ID),
          mood: submissionsDone(submissions, EMA_MOOD_FORM_ID),
        },
      });
    }
    return submissions;
  } catch (caught) {
    bxLog(
      "notifications",
      "refreshSchedules GET /me/assignments failed (kill-switch already applied on native)",
      caught,
    );
    if (Platform.OS !== "web" && satisfiedSlots !== undefined) {
      bxLog("notifications", "refreshSchedules completions-only summary", {
        satisfiedSlots,
      });
    }
    return null;
  }
}

const TEST_PREVIEW_SAMPLES: readonly { title: string; body: string }[] = [
  {
    title: "NeoTherm",
    body: "Your pain check in is ready in Assignments.",
  },
  {
    title: "NeoTherm",
    body: "A quick check in is waiting in Assignments.",
  },
  {
    title: "NeoTherm",
    body: "Your update helps your care team understand today.",
  },
  {
    title: "NeoTherm ping",
    body: "Your sleep check in should take about one minute.",
  },
  {
    title: "NeoTherm",
    body: "Your mood check in is open now.",
  },
] as const;

/**
 * Fire a **local** sample notification (~1 s) with random-ish copy — for QA / design preview only.
 */
export async function sendLocalTestPreviewNotification(): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error("Local notifications are not available in web builds.");
  }

  ensureNotificationPresentationConfigured();

  const existing = await Notifications.getPermissionsAsync();
  if (!existing.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      throw new Error(
        "Notifications are off for NeoTherm. Enable them in Settings, then try again.",
      );
    }
  }

  await ensureAndroidChannel();

  const sample =
    TEST_PREVIEW_SAMPLES[
      Math.floor(Math.random() * TEST_PREVIEW_SAMPLES.length)
    ]!;

  bxLog("notifications", "test preview queued", sample);

  await Notifications.scheduleNotificationAsync({
    identifier: `burnx_test_preview_${Date.now()}`,
    content: {
      title: sample.title,
      body: sample.body,
      data: {
        kind: "test_preview",
        href: "/forms/daily",
      },
      sound: true,
    },
    trigger: noopChannelTrigger({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    }),
  });
}

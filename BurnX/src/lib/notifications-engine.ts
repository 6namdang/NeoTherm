import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  EMA_NOTIF_COPY,
  EVENING_STRIKE_HEADS,
  firstNameFromMeName,
  noonLocalDateFromYmd,
  pickCopyIndex,
  slotTimeLabel,
} from "../constants/ema-copy";
import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "../constants/ema-forms";
import { getFormSchedule, getMe, getMeAssignments } from "./api";
import { getLastCompletion } from "./burn-date";
import { bxLog } from "./debug-log";
import { resolveAssignmentSnapshot } from "./form-assignment-eligibility";
import {
  addDaysToYmd,
  buildFallbackFormSchedule,
  localCalendarYmd,
} from "./ema-schedule-fallback";
import type { FormScheduleResponse, FormScheduleSlot } from "./ema-schedule-types";

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

function hrefForSlot(slot: FormScheduleSlot): "/forms" | `/forms/${string}` {
  if (slot.form_ids.length === 1) {
    return `/forms/${slot.form_ids[0]}`;
  }
  return "/forms";
}

function submissionsDone(
  submissions: Record<string, string | null>,
  formId: string,
): boolean {
  const v = submissions[formId];
  return typeof v === "string" && v.trim() !== "";
}

/** Local calendar YYYY-MM-DD of a completion `created_at` ISO — matches Assignments eligibility. */
function completionLocalYmd(iso: string | null): string | null {
  if (!iso || typeof iso !== "string" || iso.trim() === "") return null;
  const ms = Date.parse(iso.trim());
  if (!Number.isFinite(ms)) return null;
  return localCalendarYmd(new Date(ms));
}

/**
 * Whether today's EMA **calendar bucket** (`schedDateYmd`, same string as `/form-schedule` `date`) already has
 * submissions per instrument — grounded in **`GET /form-responses`** (same as onboarding cache), not Dynamo
 * `/me/assignments` mirrors (often sparse → false negatives → strikes never cancelled).
 */
async function emaKillSwitchFlagsForScheduleDate(schedDateYmd: string): Promise<{
  morningDone: boolean;
  eveningDone: boolean;
  allDone: boolean;
}> {
  try {
    const [sleepAt, painAt, moodAt] = await Promise.all([
      getLastCompletion(EMA_SLEEP_FORM_ID),
      getLastCompletion(EMA_PAIN_FORM_ID),
      getLastCompletion(EMA_MOOD_FORM_ID),
    ]);
    const sleepDay = completionLocalYmd(sleepAt);
    const painDay = completionLocalYmd(painAt);
    const moodDay = completionLocalYmd(moodAt);
    const morningDone = sleepDay === schedDateYmd;
    const eveningDone =
      painDay === schedDateYmd && moodDay === schedDateYmd;
    return {
      morningDone,
      eveningDone,
      allDone: morningDone && eveningDone,
    };
  } catch {
    bxLog(
      "notifications",
      "emaKillSwitchFlags failed; strikes stay scheduled (conservative)",
    );
    return { morningDone: false, eveningDone: false, allDone: false };
  }
}

/** Matches **`refreshSchedules`** pending semantics — sleep owed or evening pair incomplete. */
function emaOutstandingFromAssignmentsSubmissions(
  submissions: Record<string, string | null>,
): boolean {
  const sleepPending = !submissionsDone(submissions, EMA_SLEEP_FORM_ID);
  const eveningIncomplete =
    !submissionsDone(submissions, EMA_PAIN_FORM_ID) ||
    !submissionsDone(submissions, EMA_MOOD_FORM_ID);
  return sleepPending || eveningIncomplete;
}

/**
 * Pending EMA from Dynamo **`GET /me/assignments`** body — pure client-side, no **`GET /form-responses`**.
 * Useful only when you already hold a snapshots map; **`refreshSchedules`** no longer uses this for cancelling strikes.
 */
export function fetchEmaOutstandingFromAssignmentsSnapshot(
  submissions: Record<string, string | null>,
): boolean {
  return emaOutstandingFromAssignmentsSubmissions(submissions);
}

/**
 * **`pending`** for sleep / pain / mood matches **`resolveAssignmentSnapshot`** (Assignments UI + EMA windows +
 * **`GET /form-responses`** last completion). Use this for **toast** so we don’t diverge when `/me/assignments`
 * is sparse, omits keys, or formats timestamps differently than the runner/list.
 */
export async function emaOutstandingMatchesAssignmentsUi(): Promise<boolean> {
  try {
    const [sleep, pain, mood] = await Promise.all([
      resolveAssignmentSnapshot(EMA_SLEEP_FORM_ID),
      resolveAssignmentSnapshot(EMA_PAIN_FORM_ID),
      resolveAssignmentSnapshot(EMA_MOOD_FORM_ID),
    ]);
    return sleep.pending || pain.pending || mood.pending;
  } catch (caught) {
    bxLog(
      "notifications",
      "emaOutstandingMatchesAssignmentsUi failed; skipping toast",
      caught,
    );
    return false;
  }
}

function strikeOneBody(
  slot: FormScheduleSlot,
  when: Date,
  first: string | null,
): string {
  const n = slot.form_ids.length;
  const label = slotTimeLabel(slot.slot_id);
  if (n === 1) {
    const pool = EMA_NOTIF_COPY.INVITE_MORNING_SINGLE;
    const line = pool[pickCopyIndex(pool.length, slot.slot_id, when)]!;
    if (first && label === "morning") {
      return `${line} • ${first}, tap when ready.`;
    }
    return line;
  }

  const head =
    EVENING_STRIKE_HEADS[
      pickCopyIndex(
        EVENING_STRIKE_HEADS.length,
        `${slot.slot_id}_head`,
        when,
      )
    ]!;
  const pool = EMA_NOTIF_COPY.INVITE_EVENING_MULTI;
  const line = pool[pickCopyIndex(pool.length, slot.slot_id, when)]!;
  if (first) {
    return `${head}\nHey ${first} — ${line}`;
  }
  return `${head}\n${line}`;
}

function guiltBody(slot: FormScheduleSlot, when: Date): string {
  const pool = EMA_NOTIF_COPY.GUILT;
  return pool[pickCopyIndex(pool.length, slot.slot_id, when)]!;
}

function lossBody(slot: FormScheduleSlot, when: Date): string {
  const pool = EMA_NOTIF_COPY.LOSS;
  return pool[pickCopyIndex(pool.length, slot.slot_id, when)]!;
}

function auditBody(when: Date): string {
  const pool = EMA_NOTIF_COPY.AUDIT;
  const poolIdx = pickCopyIndex(pool.length, "audit", when);
  return pool[poolIdx]!;
}

type StrikeIx = 1 | 2 | 3;

function strikeIdentifier(
  strike: StrikeIx,
  slotId: string,
  dateYmd: string,
): string {
  return `strike-${strike}-${slotId}-${dateYmd}`;
}

export async function cancelStrikeTripletForSlot(
  slotId: string,
  dateYmd: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  for (const strike of [1, 2, 3] as const) {
    await Notifications.cancelScheduledNotificationAsync(
      strikeIdentifier(strike, slotId, dateYmd),
    );
  }
}

export async function cancelAuditStrike(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync("strike-audit-today");
}

async function scheduleStrike(args: {
  strike: StrikeIx;
  slot: FormScheduleSlot;
  scheduleDateYmd: string;
  fireIso: string;
  firstName: string | null;
  nowMs: number;
}): Promise<void> {
  const { strike, slot, scheduleDateYmd, fireIso, firstName, nowMs } = args;
  const t = Date.parse(fireIso);
  if (!Number.isFinite(t) || t <= nowMs) return;

  const when = noonLocalDateFromYmd(scheduleDateYmd);
  const body =
    strike === 1
      ? strikeOneBody(slot, when, firstName)
      : strike === 2
        ? guiltBody(slot, when)
        : lossBody(slot, when);

  const href = hrefForSlot(slot);

  await Notifications.scheduleNotificationAsync({
    identifier: strikeIdentifier(strike, slot.slot_id, scheduleDateYmd),
    content: {
      title: "BurnX",
      body,
      data: {
        kind: "ema_strike",
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
 * Full reschedule: patient local notifications for grouped EMA slots + audit tonight.
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
  const tz = -new Date().getTimezoneOffset();

  let firstName: string | null = null;
  try {
    const me = await getMe();
    firstName = firstNameFromMeName(me?.name);
  } catch {
    firstName = null;
  }

  for (let offset = 0; offset < 7; offset += 1) {
    const ymd = addDaysToYmd(localCalendarYmd(new Date(nowMs)), offset);
    let sched: FormScheduleResponse;
    try {
      sched = await getFormSchedule({ date: ymd, tz_offset_min: tz });
    } catch {
      sched = buildFallbackFormSchedule(ymd);
    }

    let killMorning = false;
    let killEvening = false;
    let killAllEma = false;
    /** Only suppress **today's** buckets using live completions; future offsets stay scheduled normally. */
    if (offset === 0 && sched.date === ymd) {
      const ks = await emaKillSwitchFlagsForScheduleDate(sched.date);
      killMorning = ks.morningDone;
      killEvening = ks.eveningDone;
      killAllEma = ks.allDone;
      bxLog("notifications", "syncSchedule kill-switch (form-responses)", {
        scheduleDate: sched.date,
        killMorning,
        killEvening,
        killAllEma,
      });
    }

    const strikesUtc = [
      ["n1_utc", 1],
      ["n2_utc", 2],
      ["n3_utc", 3],
    ] as const;

    for (const slot of sched.slots) {
      if (offset === 0) {
        if (slot.slot_id === "morning_slot" && killMorning) continue;
        if (slot.slot_id === "evening_slot" && killEvening) continue;
      }
      for (const [key, strike] of strikesUtc) {
        const utc = slot[key];
        if (typeof utc !== "string" || utc.trim() === "") continue;
        await scheduleStrike({
          strike,
          slot,
          scheduleDateYmd: ymd,
          fireIso: utc,
          firstName,
          nowMs,
        });
      }
    }

    if (offset === 0 && !killAllEma) {
      const auditMs = Date.parse(sched.n4_audit_utc);
      if (Number.isFinite(auditMs) && auditMs > nowMs) {
        const when = noonLocalDateFromYmd(sched.date);
        await Notifications.scheduleNotificationAsync({
          identifier: "strike-audit-today",
          content: {
            title: "BurnX",
            body: auditBody(when),
            data: { kind: "ema_audit", href: "/forms" },
          },
          trigger: noopChannelTrigger({
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(auditMs),
          }),
        });
      }
    }
  }

  bxLog("notifications", "syncSchedule completed");
}

/**
 * Native: cancel strike triplets / audit using **`GET /form-responses`** completions (calendar day), **never gated on Dynamo**.
 * **`GET /me/assignments`**: secondary — returns **`submissions`** snapshot for bookkeeping / logging only; **`null`** if GET throws.
 *
 * **`/me/assignments` does not drive**: home EMA count (**`resolveEmaAssignmentPending`** → **`getLastCompletion`**), Assignments UI, or toast (**`emaOutstandingMatchesAssignmentsUi`** → **`resolveAssignmentSnapshot`** → same completions + slot windows).
 */
export async function refreshSchedules(): Promise<
  Record<string, string | null> | null
> {
  /** Logged alongside optional Dynamo **`submissionsDone`** echo (truth is **`kill*`** flags). */
  let killEcho:
    | { sleepDone: boolean; eveningPairDone: boolean; allDone: boolean }
    | undefined;

  if (Platform.OS !== "web") {
    try {
      const today = localCalendarYmd();
      const {
        morningDone: sleepDone,
        eveningDone: eveningPairDone,
        allDone,
      } = await emaKillSwitchFlagsForScheduleDate(today);

      killEcho = { sleepDone, eveningPairDone, allDone };

      if (sleepDone) {
        await cancelStrikeTripletForSlot("morning_slot", today);
      }
      if (eveningPairDone) {
        await cancelStrikeTripletForSlot("evening_slot", today);
      }
      if (allDone) {
        await cancelAuditStrike();
      }
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
    if (Platform.OS !== "web" && killEcho !== undefined) {
      bxLog("notifications", "refreshSchedules", {
        completionsKillSwitch: killEcho,
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
    if (Platform.OS !== "web" && killEcho !== undefined) {
      bxLog("notifications", "refreshSchedules completions-only summary", killEcho);
    }
    return null;
  }
}

const TEST_PREVIEW_SAMPLES: readonly { title: string; body: string }[] = [
  {
    title: "BurnX",
    body: "Evening duo on deck.\nPain + mood, pocket edition.",
  },
  {
    title: "BurnX",
    body: "Plot twist: Assignments misses you.",
  },
  {
    title: "BurnX",
    body: "Two minutes beats two guilt spirals.",
  },
  {
    title: "BurnX ping",
    body: "~60-second sleep recap. Coffee optional.",
  },
  {
    title: "BurnX",
    body: "Window sunsetting — tap before it ghosts you.",
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
        "Notifications are off for BurnX. Enable them in Settings, then try again.",
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
        href: "/forms",
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

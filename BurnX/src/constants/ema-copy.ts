/**
 * Copy for local EMA open notifications — short for lock-screen previews.
 * Pools use day-of-year modulo per slotId (deterministic).
 */

import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "./ema-forms";

export const EMA_NOTIF_COPY = {
  INVITE_SLEEP: [
    "Morning quest unlocked, tell NeoTherm how you slept.",
    "Your sleep streak wants one tiny answer.",
    "Log last night's sleep before the day gets noisy.",
    "One sleep check in can power today's recovery picture.",
    "Your morning sleep badge is ready to claim.",
    "Tell us how rested you feel and keep the streak alive.",
    "Your care team gets smarter when your sleep log lands.",
    "Sleep recap time, one minute and you are done.",
    "A quick sleep update is waiting like a friendly owl.",
    "Last night has data, NeoTherm just needs your tap.",
    "Your recovery story starts today with sleep.",
    "Add your sleep check in before coffee wins.",
    "Tiny sleep mission ready now.",
    "Tap in and tell NeoTherm how your night went.",
    "Your sleep update is the first win of the day.",
    "Claim your morning check in with one quick sleep answer.",
  ],
  INVITE_PAIN: [
    "Pain check in is open, one quick tap.",
    "Tell NeoTherm how your pain feels right now.",
    "Your pain update helps your care team track recovery.",
    "A short pain answer keeps today's record current.",
    "Pain check in ready in Assignments.",
    "One minute to log how you're feeling.",
    "Your pain snapshot is waiting.",
    "Quick pain update, useful signal for your team.",
    "Tap in and share how your pain feels.",
    "Your recovery log wants a pain update.",
    "Pain check in unlocked for today.",
    "How's your pain right now? NeoTherm is listening.",
  ],
  INVITE_MOOD: [
    "Mood check in is open, one quick tap.",
    "Tell NeoTherm how you're feeling right now.",
    "Your mood update helps your care team track recovery.",
    "A short mood answer keeps today's record current.",
    "Mood check in ready in Assignments.",
    "One minute to log how you're feeling.",
    "Your mood snapshot is waiting.",
    "Quick mood update, useful signal for your team.",
    "Tap in and share how your mood feels.",
    "Your recovery log wants a mood update.",
    "Mood check in unlocked for today.",
    "How's your mood right now? NeoTherm is listening.",
  ],
} as const;

const SLOT_ORDINALS: Record<string, number> = {
  sleep_am: 0,
  pain_am: 11,
  pain_pm: 20,
  mood_noon: 12,
  mood_night: 22,
};

function slotOrdinal(slotId: string): number {
  if (slotId in SLOT_ORDINALS) return SLOT_ORDINALS[slotId]!;
  let h = 0;
  for (let i = 0; i < slotId.length; i += 1) {
    h = (h * 31 + slotId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 97;
}

/** Local noon on calendar `yyyy-mm-dd` — stable anchor for day-based pickers. */
export function noonLocalDateFromYmd(ymd: string): Date {
  const [y, m, da] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, da ?? 1, 12, 0, 0, 0);
}

/** Local calendar day-of-year, 1-based (handles leap years via Date). */
export function dayOfYearLocal(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Stable index for poolLength using day-of-year and slot id. */
export function pickCopyIndex(
  poolLength: number,
  slotId: string,
  when: Date,
): number {
  if (poolLength <= 0) return 0;
  const doy = dayOfYearLocal(when);
  const salt = slotOrdinal(slotId) * 31;
  return (doy - 1 + salt) % poolLength;
}

function copyPoolForFormId(
  formId: string,
): readonly string[] {
  if (formId === EMA_SLEEP_FORM_ID) return EMA_NOTIF_COPY.INVITE_SLEEP;
  if (formId === EMA_PAIN_FORM_ID) return EMA_NOTIF_COPY.INVITE_PAIN;
  return EMA_NOTIF_COPY.INVITE_MOOD;
}

/** Body text for a single open notification (one per slot). */
export function openNotificationBody(
  formId: string,
  slotId: string,
  when: Date,
  firstName: string | null,
): string {
  const pool = copyPoolForFormId(formId);
  const line = pool[pickCopyIndex(pool.length, slotId, when)]!;
  if (firstName && formId === EMA_SLEEP_FORM_ID) {
    return `${line} • ${firstName}, tap when ready.`;
  }
  return line;
}

export function firstNameFromMeName(name: string | undefined): string | null {
  if (typeof name !== "string") return null;
  const t = name.trim();
  if (t === "") return null;
  const first = t.split(/\s+/)[0];
  return first.length > 0 ? first : null;
}

/**
 * Copy for local notifications — short for lock-screen previews; pools use day-of-year modulo per slotId (deterministic).
 */

/** Lead line for grouped evening reminders (paired forms). */
export const EVENING_STRIKE_HEADS = [
  "Evening duo. Two whole forms. Try not to faint.",
  "Pain plus mood. Shocker I know.",
  "Two pings. Try to act surprised.",
  "Pair of quick taps before you vanish into relax mode again.",
  "Short stack. Mood plus pain. Groundbreaking stuff.",
  "Twilight questionnaires. Tiny commitment you will probably dodge.",
  "Double feature. Still shorter than your excuses.",
] as const;

export const EMA_NOTIF_COPY = {
  INVITE_MORNING_SINGLE: [
    "Sixty seconds. One sleep check in. Revolutionary I know.",
    "Morning checkpoint. Sleep edition. Still too hard?",
    "Before chaos swallows you. Tap the sleep thing.",
    "Coffee first. Fair. Sleep log second. Or never.",
    "One bright log before the usual sprint away.",
    "Slot is warm. Snag your sleep cue. Or dont.",
    "Micro morning mission. Unlocked and currently ignored.",
    "Early bird bonus. Sleepy data capture. For people who actually do it.",
    "Hydrate brain. Hydrate chart. Tap sleep. Novel concept.",
    "Still morning. Perfect time to remember you have responsibilities.",
    "Morning stretch for your diary. Sleep vibes or silence.",
    "Brief sleep pulse. Beats pretending it didnt happen.",
    "Clock in how you rested. Quick. Before you forget again.",
    "Quiet window. Loud impact. Sleep check. Whenever you feel like it.",
    "Mornings lightweight carry. Sleep form. If you can manage.",
    "Starter quest. Quantify last night. Shocking concept.",
  ],
  INVITE_EVENING_MULTI: [
    "Queue is short. Pain plus mood on deck. Scary right.",
    "Evening shorthand. Moods plus aches. Try to survive.",
    "Two prompts. Neither wrote a novel. Miracles.",
    "Binary mood plus pain vibes check. Groundbreaking.",
    "Dusk questionnaires. Petite package you love ignoring.",
    "Low battery friendly questions ahead. How convenient.",
    "Pair of sliders. Big signal. If you ever show up.",
    "After work microforms await your grand return.",
    "Sunset snippets. Snapshot feels plus hurt. Whenever.",
    "Goldilocks length. Not tedious. Still too much apparently.",
    "Evening encore. Painless logging. For once.",
    "Compact feels plus ache audit. Thrilling stuff.",
    "Snack questions. Serious insight. If you bother.",
    "Wrap day with brisk data drops. Or just ghost it.",
    "Twilight pings are pocket sized. Unlike your procrastination.",
  ],
  GUILT: [
    "Busy is normal. Tiny logs still exist apparently.",
    "Procrastinating is free. Knocking this off feels better. Crazy idea.",
    "Care teams thrive on breadcrumbs. Sprinkle some. Whenever you get around to it.",
    "Two minutes beats two guilt cycles. Shocker.",
    "Momentum loves baby steps. Too bad you prefer standing still.",
    "You versus delay. Spoilers. You usually lose.",
    "Micro effort beats macro stress later. Wild concept.",
    "Skippers remorse is optional. Tap in. Or dont. Again.",
    "Data elves cheering for crumbs. They are still waiting.",
    "Chaos tolerated. Unanswered forms less so. Weird how that works.",
    "Small inputs. Loud clarity downstream. If you ever provide them.",
    "Thumb workout pending. Ethically approved and currently ignored.",
    "Future calm thanks present tiny actions. Future you is not holding breath.",
    "Delay tax accrues. Zero interest payoff here. If you ever pay.",
    "Low key hero mode. Checkbox domination. Or continued avoidance.",
  ],
  LOSS: [
    "This window sunsets soon. Snag it. Or watch it leave.",
    "Timer is munching daylight on this cue. As usual.",
    "Vanishing slot energy. Care to intervene this time.",
    "Last call physics apply here. No pressure.",
    "Calendar page turns. Hitch a ride. Or stay behind.",
    "Hourglass sass. Still sand. Hurry. Maybe.",
    "Deadline whispers loudly. Politely of course.",
    "Escape room but it is just taps. Clock ticks while you stall.",
    "Portal closes. Keys are questionnaires. Good luck.",
    "Sunset clauses love drama. Deny them. Or feed them.",
    "Time budget shrinks. Invest a minute. Revolutionary.",
    "Miss now. Reschedule feelings later. Your signature move.",
    "Hurry flavor. Softly spicy. Take it or leave it.",
    "Slot ghosting imminent. Haunt it first. Or keep going.",
    "Final lap flag waves. Playful not scary. Still ignored.",
    "Momentum decay alert. Stabilize with tap. Whenever.",
    "Rolling credits soon. Encore your answers. Or not.",
    "Todays train departs. Platform equals Assignments. You know the drill.",
  ],
  AUDIT: [
    "Sweep loose check ins. Declutter brain. Novel idea.",
    "Assignments tab still lit. Tame it. If you feel like it.",
    "Unfinished pings throwing shade. Shocking.",
    "Inbox ish energy for questionnaires. How fun.",
    "Scatterplot of undone items. Linearize it. Someday.",
    "Chaos tolerated. Blank forms mocked gently. By everyone.",
    "Audit says crumbs remain. Crumbs begone. Eventually.",
    "White space guilt. Fill with tiny logs. Or enjoy the guilt.",
    "Evening bookkeeping. Psyche edition. Thrilling.",
    "Tab waits like patient golden retriever. More patient than you.",
    "Outstanding items audition for closure. They are still waiting.",
    "Days subplot unresolved. Spoilers. You fix it. Theoretically.",
    "Notification wearing costume. Friendly audit. Sure.",
    "Scoreboard glitch. Undone tasks grinning at you.",
    "Wrap party missing RSVPs. Add yours. Maybe later.",
    "Peace treaty with to do pending signatures. Still unsigned.",
    "Assign chaos level. Tameable kitten. Or full disaster.",
    "Glow up move. Slam pending forms. When you are ready.",
    "Life admin speedrun checkpoint. Current record disappointing.",
    "Debt collector but for clarity. Benign and still unpaid.",
    "Sticky notes mutated into notifications. They multiplied.",
  ],
} as const;

function slotOrdinal(slotId: string): number {
  if (slotId === "morning_slot") return 0;
  if (slotId === "evening_slot") return 17;
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

/**
 * Stable index for poolLength using day-of-year and slot id so morning/evening
 * rarely pick identical guilt text the same day.
 */
export function pickCopyIndex(
  poolLength: number,
  slotId: string,
  when: Date,
): number {
  if (poolLength <= 0) return 0;
  const doy = dayOfYearLocal(when);
  const salt = slotOrdinal(slotId) * 31;
  return ((doy - 1) + salt) % poolLength;
}

export function slotTimeLabel(slotId: string): "morning" | "evening" {
  return slotId === "evening_slot" ? "evening" : "morning";
}

export function firstNameFromMeName(name: string | undefined): string | null {
  if (typeof name !== "string") return null;
  const t = name.trim();
  if (t === "") return null;
  const first = t.split(/\s+/)[0];
  return first.length > 0 ? first : null;
}
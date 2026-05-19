/**
 * Shared shape for Care-program scale questionnaires (LIBRE, PSQI, pain intensity, etc.).
 * Answers are zero-based option indices into `scales[scaleId].labels`.
 */

export type Scale = {
  labels: string[];
};

export type ShowIfCondition = {
  questionId: string;
  equals: number;
};

export type ShowIf = {
  anyOf: ShowIfCondition[];
};

export type ScaleQuestionnaireQuestion = {
  id: string;
  text: string;
  scaleId: string;
  showIf?: ShowIf;
};

export type ScaleQuestionnaireSection = {
  id: string;
  title?: string;
  instructions?: string;
  questions: ScaleQuestionnaireQuestion[];
};

export type AssignmentDailyLocalStart = {
  hour: number;
  minute: number;
};

export type ScaleQuestionnaireForm = {
  id: string;
  name: string;
  description: string;
  scales: Record<string, Scale>;
  sections: ScaleQuestionnaireSection[];
  /** If set, Assignment reappears this many whole days after the latest submission `created_at`. Omit = one completion hides until product changes. Ignored when `assignmentDailyLocalStart` is set. */
  assignmentCadenceDays?: number;
  /**
   * If set, the patient needs a submission in the current local **period** `[periodStart, nextPeriodStart)`
   * where each `periodStart` is this clock time on successive calendar days (device timezone).
   * Example: `{ hour: 18, minute: 30 }` → periods switch at 6:30 PM local. Takes precedence over `assignmentCadenceDays`.
   */
  assignmentDailyLocalStart?: AssignmentDailyLocalStart;
};

/** Map of question `id` → chosen option index for `ScaleQuestionnaireForm`. */
export type ScaleAnswers = Record<string, number>;

export type VoiceCheckinTask = {
  id: string;
  label: string;
  instruction: string;
  durationMs: number;
};

/**
 * Care-program assignment window: card visible in `[slot, nextSlot)` in device local time.
 * `daysOfWeek` uses `Date.getDay()` (0 Sunday … 6 Saturday). Example: Mon/Wed/Fri → `[1, 3, 5]`.
 */
export type WeeklyLocalAssignmentSlots = {
  daysOfWeek: readonly number[];
  hour: number;
  minute: number;
};

export type VoiceCheckinForm = {
  id: string;
  name: string;
  description: string;
  assignmentDaysOfWeek: readonly number[];
  assignmentTimeOfDay: { hour: number; minute: number };
  type: "voice";
  tasks: readonly VoiceCheckinTask[];
};

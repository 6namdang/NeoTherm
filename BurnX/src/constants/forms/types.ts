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
  /**
   * Assignable only on listed calendar weekdays, midnight–midnight local (`Date.getDay()`: 0 Sun … 6 Sat).
   * Takes precedence over `assignmentCadenceDays` and `assignmentDailyLocalStart`.
   */
  assignmentWeeklyFullDays?: readonly number[];
};

/** Map of question `id` → chosen option index for `ScaleQuestionnaireForm`. */
export type ScaleAnswers = Record<string, number>;

export type VoiceCheckinTask = {
  id: string;
  label: string;
  instruction: string;
  durationMs: number;
};

export type VoiceCheckinForm = {
  id: string;
  name: string;
  description: string;
  /** Assignable only on these weekdays, midnight–midnight local (`0` Sun … `6` Sat). Pilot: no overdue carryover. */
  assignmentWeeklyFullDays: readonly number[];
  type: "voice";
  tasks: readonly VoiceCheckinTask[];
};

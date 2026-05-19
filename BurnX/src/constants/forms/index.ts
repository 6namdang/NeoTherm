import { COGNITIVE_FUNCTION_FORM } from "./cognitive-function";
import { ALL_EMA_FORMS } from "../ema-forms";
import { FATIGUE_FORM } from "./fatigue";
import { GAD7_FORM } from "./gad7";
import { LIBRE_FORM } from "./libre";
import { PAIN_INTENSITY_FORM } from "./pain-intensity";
import { PAIN_INFERENCE_FORM } from "./pain-inference";
import { PSQI_FORM } from "./psqi";
import { VOICE_CHECKIN_FORM } from "./voice-checkin";
import type {
  ScaleQuestionnaireForm,
  AssignmentDailyLocalStart,
  WeeklyLocalAssignmentSlots,
} from "./types";

/** Registered scale questionnaires (Care programs). Order = list order. */
export const ALL_FORMS: readonly ScaleQuestionnaireForm[] = [
  PAIN_INTENSITY_FORM,
  PAIN_INFERENCE_FORM,
  LIBRE_FORM,
  PSQI_FORM,
  COGNITIVE_FUNCTION_FORM,
  FATIGUE_FORM,
  GAD7_FORM,
];

export const FORMS_BY_ID: Record<string, ScaleQuestionnaireForm> =
  Object.fromEntries([
    ...ALL_FORMS.map((f) => [f.id, f] as const),
    ...ALL_EMA_FORMS.map((f) => [f.id, f] as const),
  ]);

export function getFormById(id: string): ScaleQuestionnaireForm | undefined {
  return FORMS_BY_ID[id];
}

/** Care-program `form_id` values that appear on patient dashboard / assignments. */
export const ASSIGNABLE_CARE_FORM_IDS: ReadonlySet<string> = new Set([
  ...ALL_FORMS.map((f) => f.id),
  ...ALL_EMA_FORMS.map((f) => f.id),
]);

export type FormDefinition = {
  id: string;
  title: string;
  description: string;
  assignmentCadenceDays?: number;
  assignmentDailyLocalStart?: AssignmentDailyLocalStart;
  /**
   * Mon/Wed/Fri-style visibility: assignment row appears only between this local slot boundary
   * and the next; completions do not gate visibility (see Assignments loader).
   */
  assignmentWeeklyLocalSlots?: WeeklyLocalAssignmentSlots;
};

const scaleAssignments: FormDefinition[] = ALL_FORMS.map((f) => ({
  id: f.id,
  title: f.name,
  description: f.description,
  assignmentCadenceDays: f.assignmentCadenceDays,
  assignmentDailyLocalStart: f.assignmentDailyLocalStart,
}));

const voiceWeeklySlots: WeeklyLocalAssignmentSlots = {
  daysOfWeek: [...VOICE_CHECKIN_FORM.assignmentDaysOfWeek],
  hour: VOICE_CHECKIN_FORM.assignmentTimeOfDay.hour,
  minute: VOICE_CHECKIN_FORM.assignmentTimeOfDay.minute,
};

const voiceAssignment: FormDefinition = {
  id: VOICE_CHECKIN_FORM.id,
  title: VOICE_CHECKIN_FORM.name,
  description: VOICE_CHECKIN_FORM.description,
  assignmentWeeklyLocalSlots: voiceWeeklySlots,
};

const emaAssignments: FormDefinition[] = ALL_EMA_FORMS.map((f) => ({
  id: f.id,
  title: f.name,
  description: f.description,
}));

/** Patient Care programmes list (scale questionnaires + Voice Check-In). */
export const forms: FormDefinition[] = [
  voiceAssignment,
  ...emaAssignments,
  ...scaleAssignments,
];

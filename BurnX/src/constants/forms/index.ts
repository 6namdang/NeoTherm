import { COGNITIVE_FUNCTION_FORM } from "./cognitive-function";
import { ALL_EMA_FORMS } from "../ema-forms";
import { FATIGUE_FORM } from "./fatigue";
import { GAD7_FORM } from "./gad7";
import { LIBRE_FORM } from "./libre";
import { LONG_ASSESSMENT_FORM } from "./long-assessment";
import { MOCA_FORM, isMocaStandaloneTestingEnabled } from "./moca";
import { PAIN_INTENSITY_FORM } from "./pain-intensity";
import { PAIN_INFERENCE_FORM } from "./pain-inference";
import { PSQI_FORM } from "./psqi";
import type {
  ScaleQuestionnaireForm,
  AssignmentDailyLocalStart,
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

/** Scale forms with their own assignment schedule (LIBRE weekly). */
const ASSIGNABLE_SCALE_FORMS: readonly ScaleQuestionnaireForm[] = [LIBRE_FORM];

export const FORMS_BY_ID: Record<string, ScaleQuestionnaireForm> =
  Object.fromEntries([
    ...ALL_FORMS.map((f) => [f.id, f] as const),
    ...ALL_EMA_FORMS.map((f) => [f.id, f] as const),
  ]);

export function getFormById(id: string): ScaleQuestionnaireForm | undefined {
  if (id === MOCA_FORM.id) {
    return {
      id: MOCA_FORM.id,
      name: MOCA_FORM.name,
      description: MOCA_FORM.description,
      sections: [],
      scales: {},
    };
  }
  return FORMS_BY_ID[id];
}

/** Care-program `form_id` values that appear on patient dashboard / assignments. */
export const ASSIGNABLE_CARE_FORM_IDS: ReadonlySet<string> = new Set([
  ...ASSIGNABLE_SCALE_FORMS.map((f) => f.id),
  ...ALL_EMA_FORMS.map((f) => f.id),
  LONG_ASSESSMENT_FORM.id,
]);

export type FormDefinition = {
  id: string;
  title: string;
  description: string;
  assignmentCadenceDays?: number;
  assignmentDailyLocalStart?: AssignmentDailyLocalStart;
  /** Calendar-day assignment windows (0=Sun … 6=Sat), midnight–midnight local. */
  assignmentWeeklyFullDays?: readonly number[];
};

const scaleAssignments: FormDefinition[] = ASSIGNABLE_SCALE_FORMS.map((f) => ({
  id: f.id,
  title: f.name,
  description: f.description,
  assignmentCadenceDays: f.assignmentCadenceDays,
  assignmentDailyLocalStart: f.assignmentDailyLocalStart,
  assignmentWeeklyFullDays: f.assignmentWeeklyFullDays,
}));

const longAssessmentAssignment: FormDefinition = {
  id: LONG_ASSESSMENT_FORM.id,
  title: LONG_ASSESSMENT_FORM.name,
  description: LONG_ASSESSMENT_FORM.description,
};

const mocaStandaloneAssignment: FormDefinition | null = isMocaStandaloneTestingEnabled()
  ? {
      id: MOCA_FORM.id,
      title: MOCA_FORM.name,
      description: MOCA_FORM.description,
    }
  : null;

const emaAssignments: FormDefinition[] = ALL_EMA_FORMS.map((f) => ({
  id: f.id,
  title: f.name,
  description: f.description,
}));

/** Patient Care programmes list (EMA + LIBRE + Long Assessment bundle; Voice is on the Voice tab). */
export const forms: FormDefinition[] = [
  ...emaAssignments,
  ...scaleAssignments,
  ...(mocaStandaloneAssignment ? [mocaStandaloneAssignment] : []),
  longAssessmentAssignment,
];

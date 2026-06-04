import {
  EMA_MOOD_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_SLEEP_FORM_ID,
} from "../constants/ema-forms";
import {
  MOCA_FORM_ID,
  isMocaStandaloneTestingEnabled,
  MOCA_STANDALONE_ROUTE,
} from "../constants/forms/moca";
import type { Href } from "expo-router";

export const LONG_ASSESSMENT_BUNDLE_ID = "long_assessment_v1";

export const DAILY_FORM_IDS = [
  EMA_SLEEP_FORM_ID,
  EMA_PAIN_FORM_ID,
  EMA_MOOD_FORM_ID,
] as const;

/** `moca_v1` is completed inside the Long Assessment bundle (day 30/60). */
export const WEEKLY_FORM_IDS = isMocaStandaloneTestingEnabled()
  ? (["libre_v1", MOCA_FORM_ID] as const)
  : (["libre_v1"] as const);

export const LONG_FORM_IDS = [
  "pain_intensity_v1",
  "pain_inference_v1",
  "psqi_v1",
  "fatigue_v1",
  "gad7_v1",
  "cognitive_function_v1",
  "moca_v1",
] as const;

const DAILY_SET = new Set<string>(DAILY_FORM_IDS);
const WEEKLY_SET = new Set<string>(WEEKLY_FORM_IDS);
const LONG_MEMBER_SET = new Set<string>(LONG_FORM_IDS);

export function isLongAssessmentMemberFormId(formId: string): boolean {
  return LONG_MEMBER_SET.has(formId);
}

/** Care programs top-tab route after completing or backing out of a questionnaire. */
export function careProgramsTabHrefForFormId(formId: string): Href {
  if (DAILY_SET.has(formId)) return "/forms/daily" as Href;
  if (WEEKLY_SET.has(formId)) return "/forms/weekly" as Href;
  if (isMocaStandaloneTestingEnabled() && formId === MOCA_FORM_ID) {
    return "/forms/weekly" as Href;
  }
  if (formId === LONG_ASSESSMENT_BUNDLE_ID) return "/forms/long" as Href;
  if (LONG_MEMBER_SET.has(formId)) return "/forms/long" as Href;
  return "/forms/long" as Href;
}

/** Route when opening MoCA from assignments (standalone testing vs generic form id). */
export function mocaFormHref(): Href {
  if (isMocaStandaloneTestingEnabled()) {
    return MOCA_STANDALONE_ROUTE as Href;
  }
  return "/forms/long-assessment" as Href;
}

/** Patient navigation target when opening a care-program row from Home. */
export function careProgramFormHref(formId: string): Href {
  if (formId === LONG_ASSESSMENT_BUNDLE_ID) {
    return "/forms/long-assessment" as Href;
  }
  return `/forms/${formId}` as Href;
}

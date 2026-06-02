import type { ScaleQuestionnaireForm } from "./types";

/**
 * PROMIS Short Form v1.0: Fatigue 7a (adult). Recall window is shown in the form runner chip.
 *
 * Question IDs unchanged (fatigue_1…fatigue_7); form_id remains fatigue_v1.
 */
export const FATIGUE_FORM: ScaleQuestionnaireForm = {
  id: "fatigue_v1",
  name: "Fatigue",
  description: "How fatigue has affected you. The time frame is shown above.",
  scales: {
    fatigue_frequency: {
      labels: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    },
  },
  sections: [
    {
      id: "main",
      questions: [
        {
          id: "fatigue_1",
          text: "How often did you feel tired?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_2",
          text: "How often did you experience extreme exhaustion?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_3",
          text: "How often did you run out of energy?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_4",
          text: "How often did your fatigue limit you at work (include work at home)?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_5",
          text: "How often were you too tired to think clearly?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_6",
          text: "How often were you too tired to take a bath or shower?",
          scaleId: "fatigue_frequency",
        },
        {
          id: "fatigue_7",
          text: "How often did you have enough energy to exercise strenuously?",
          scaleId: "fatigue_frequency",
        },
      ],
    },
  ],
};

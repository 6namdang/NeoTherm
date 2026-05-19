import type { ScaleQuestionnaireForm } from "./types";

/**
 * Pain interference questionnaire. Same scale across items.
 * Option indices map to PROMIS-like labels Not at all → Very much (stored 0 to 4).
 */
export const PAIN_INFERENCE_FORM: ScaleQuestionnaireForm = {
  id: "pain_inference_v1",
  name: "Pain interference",
  description:
    "How much pain interfered with daily life. The time frame is shown above.",
  assignmentCadenceDays: 7,
  scales: {
    interference_7d: {
      labels: [
        "Not at all",
        "A little bit",
        "Somewhat",
        "Quite a bit",
        "Very much",
      ],
    },
  },
  sections: [
    {
      id: "main",
      title: "Pain interference",
      instructions:
        "Respond to each question or statement by choosing one answer per row.",
      questions: [
        {
          id: "PAININ9",
          text:
            "How much did pain interfere with your day to day activities?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ22",
          text:
            "How much did pain interfere with work around the home?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ31",
          text:
            "How much did pain interfere with your ability to participate in social activities?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ34",
          text: "How much did pain interfere with your household chores?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ12",
          text:
            "How much did pain interfere with the things you usually do for fun?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ36",
          text:
            "How much did pain interfere with your enjoyment of social activities?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ3",
          text: "How much did pain interfere with your enjoyment of life?",
          scaleId: "interference_7d",
        },
        {
          id: "PAININ13",
          text: "How much did pain interfere with your family life?",
          scaleId: "interference_7d",
        },
      ],
    },
  ],
};

import type { ScaleQuestionnaireForm } from "./types";

/** Brief daily pain-intensity check-in. New local period each day at 6:30 PM (device time). */
export const PAIN_INTENSITY_FORM: ScaleQuestionnaireForm = {
  id: "pain_intensity_v1",
  name: "Pain intensity",
  description:
    "A short daily snapshot of worst, average, and current pain, for your clinical team.",
  scales: {
    past_pain: {
      labels: [
        "Had no pain",
        "Mild",
        "Moderate",
        "Severe",
        "Very severe",
      ],
    },
    current_pain: {
      labels: ["No pain", "Mild", "Moderate", "Severe", "Very severe"],
    },
  },
  sections: [
    {
      id: "main",
      title: "Today's pain",
      questions: [
        {
          id: "PAINQU6",
          text: "How intense was your pain at its worst?",
          scaleId: "past_pain",
        },
        {
          id: "PAINQU8",
          text: "How intense was your average pain?",
          scaleId: "past_pain",
        },
        {
          id: "PAINQU21",
          text: "What is your level of pain right now?",
          scaleId: "current_pain",
        },
      ],
    },
  ],
};

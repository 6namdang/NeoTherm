import type { ScaleQuestionnaireForm } from "./types";

/** GAD-7 anxiety items; weekly reassignment on the app cadence. Recall window is shown above. */
export const GAD7_FORM: ScaleQuestionnaireForm = {
  id: "gad7_v1",
  name: "GAD-7",
  description: "Anxiety screening. The time frame is shown above.",
  scales: {
    gad7_frequency: {
      labels: [
        "Not at all",
        "Several days",
        "More than half the days",
        "Nearly every day",
      ],
    },
  },
  sections: [
    {
      id: "main",
      instructions:
        "How often have you been bothered by the following problems?",
      questions: [
        {
          id: "gad7_1",
          text: "Feeling nervous, anxious, or on edge",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_2",
          text: "Not being able to stop or control worrying",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_3",
          text: "Worrying too much about different things",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_4",
          text: "Trouble relaxing",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_5",
          text: "Being so restless that it's hard to sit still",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_6",
          text: "Becoming easily annoyed or irritable",
          scaleId: "gad7_frequency",
        },
        {
          id: "gad7_7",
          text: "Feeling afraid as if something awful might happen",
          scaleId: "gad7_frequency",
        },
      ],
    },
  ],
};

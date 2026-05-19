import type { ScaleQuestionnaireForm } from "./types";

/** PROM-style cognitive symptom screen. Weekly cadence; recall chip shows the reporting window. */
export const COGNITIVE_FUNCTION_FORM: ScaleQuestionnaireForm = {
  id: "cognitive_function_v1",
  name: "Cognitive function",
  description: "Thinking and concentration. The time frame is shown above.",
  assignmentCadenceDays: 7,
  scales: {
    cognitive_frequency: {
      labels: ["Never", "Rarely", "Sometimes", "Often", "Very often"],
    },
  },
  sections: [
    {
      id: "main",
      questions: [
        {
          id: "cognitive_1",
          text: "I have had trouble concentrating",
          scaleId: "cognitive_frequency",
        },
        {
          id: "cognitive_2",
          text: "I have had trouble keeping track of what I was doing",
          scaleId: "cognitive_frequency",
        },
        {
          id: "cognitive_3",
          text: "I have had trouble thinking clearly",
          scaleId: "cognitive_frequency",
        },
        {
          id: "cognitive_4",
          text: "My thinking has been slow",
          scaleId: "cognitive_frequency",
        },
      ],
    },
  ],
};

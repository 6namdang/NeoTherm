import type { ScaleQuestionnaireForm } from './types';

export const EMA_PAIN_NOW_FORM: ScaleQuestionnaireForm = {
  id: 'ema_pain_now_v1',
  name: 'Pain Check-In',
  description: 'Quick daily pain rating.',
  assignmentCadenceDays: 1,
  scales: {
    pain_vas_11: {
      labels: [
        '0 - No pain',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10 - Worst pain imaginable',
      ],
    },
  },
  sections: [
    {
      id: 'main',
      questions: [
        {
          id: 'ema_pain_worst_24h',
          text: 'What was your worst burn pain in the last 24 hours?',
          scaleId: 'pain_vas_11',
        },
      ],
    },
  ],
};
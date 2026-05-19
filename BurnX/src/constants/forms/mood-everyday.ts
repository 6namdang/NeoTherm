import type { ScaleQuestionnaireForm } from './types';

export const EMA_MOOD_FORM: ScaleQuestionnaireForm = {
  id: 'ema_mood_v1',
  name: 'Mood Check-In',
  description: 'A quick overall mood rating.',
  assignmentCadenceDays: 1,
  scales: {
    mood_vas_11: {
      labels: [
        '0 - Worst possible',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10 - Best possible',
      ],
    },
  },
  sections: [
    {
      id: 'main',
      questions: [
        {
          id: 'ema_mood_today',
          text: 'How would you rate your overall mood today?',
          scaleId: 'mood_vas_11',
        },
      ],
    },
  ],
};
import type { ScaleQuestionnaireForm } from './types';

export const EMA_SLEEP_QUALITY_FORM: ScaleQuestionnaireForm = {
  id: 'ema_sleep_quality_v1',
  name: 'Sleep Check-In',
  description: 'How well you slept last night.',
  assignmentCadenceDays: 1,
  scales: {
    sleep_vas_11: {
      labels: [
        '0 - Worst sleep',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10 - Best sleep',
      ],
    },
  },
  sections: [
    {
      id: 'main',
      questions: [
        {
          id: 'ema_sleep_quality_last_night',
          text: 'How would you rate the quality of your sleep last night?',
          scaleId: 'sleep_vas_11',
        },
      ],
    },
  ],
};
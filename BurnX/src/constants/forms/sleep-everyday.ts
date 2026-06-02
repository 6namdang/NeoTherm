import type { ScaleQuestionnaireForm } from './types';
import { EMA_SLEEP_FORM_ID } from '../ema-form-ids';
import { emaScaleLabels } from '../../lib/ema-vas-config';

export const EMA_SLEEP_QUALITY_FORM: ScaleQuestionnaireForm = {
  id: EMA_SLEEP_FORM_ID,
  name: 'Sleep Check-In',
  description: 'How well you slept last night.',
  assignmentCadenceDays: 1,
  scales: {
    sleep_vas_11: {
      labels: [...emaScaleLabels(EMA_SLEEP_FORM_ID)],
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

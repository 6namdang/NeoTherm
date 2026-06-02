import type { ScaleQuestionnaireForm } from './types';
import { EMA_MOOD_FORM_ID } from '../ema-form-ids';
import { emaScaleLabels } from '../../lib/ema-vas-config';

export const EMA_MOOD_FORM: ScaleQuestionnaireForm = {
  id: EMA_MOOD_FORM_ID,
  name: 'Mood Check-In',
  description: 'A quick overall mood rating.',
  assignmentCadenceDays: 1,
  scales: {
    mood_vas_11: {
      labels: [...emaScaleLabels(EMA_MOOD_FORM_ID)],
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

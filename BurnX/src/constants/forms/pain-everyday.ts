import type { ScaleQuestionnaireForm } from './types';
import { EMA_PAIN_FORM_ID } from '../ema-form-ids';
import { emaScaleLabels } from '../../lib/ema-vas-config';

export const EMA_PAIN_NOW_FORM: ScaleQuestionnaireForm = {
  id: EMA_PAIN_FORM_ID,
  name: 'Pain Check-In',
  description: 'Quick daily pain rating.',
  assignmentCadenceDays: 1,
  scales: {
    pain_vas_11: {
      labels: [...emaScaleLabels(EMA_PAIN_FORM_ID)],
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

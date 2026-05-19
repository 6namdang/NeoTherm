import type { ScaleQuestionnaireForm } from "./types";

export const PSQI_FORM: ScaleQuestionnaireForm = {
  id: "psqi_v1",
  name: "PSQI",
  description: "Sleep quality assessment",
  assignmentCadenceDays: 7,
  scales: {
    psqi_time_bed: {
      labels: [
        'Before 9:00 PM',
        '9:00 PM to 10:59 PM',
        '11:00 PM to 12:59 AM',
        '1:00 AM or later',
      ],
    },
    psqi_sleep_latency_minutes: {
      labels: [
        '15 minutes or less',
        '16 to 30 minutes',
        '31 to 60 minutes',
        'More than 60 minutes',
      ],
    },
    psqi_time_wakeup: {
      labels: [
        'Before 5:00 AM',
        '5:00 AM to 6:59 AM',
        '7:00 AM to 8:59 AM',
        '9:00 AM or later',
      ],
    },
    psqi_sleep_hours: {
      labels: [
        'More than 7 hours',
        '6 to 7 hours',
        '5 to less than 6 hours',
        'Less than 5 hours',
      ],
    },
    psqi_frequency: {
      labels: [
        'Not during this period',
        'Less than once a week',
        'Once or twice a week',
        'Three or more times a week',
      ],
    },
    psqi_sleep_quality: {
      labels: ['Very good', 'Fairly good', 'Fairly bad', 'Very bad'],
    },
    psqi_daytime_problem: {
      labels: [
        'No problem at all',
        'Only a very slight problem',
        'Somewhat of a problem',
        'A very big problem',
      ],
    },
    psqi_bed_partner: {
      labels: [
        'No bed partner or room mate',
        'Partner/room mate in other room',
        'Partner in same room, but not same bed',
        'Partner in same bed',
      ],
    },
  },
  sections: [
    {
      id: 'sleep_habits',
      title: 'Usual Sleep Habits',
      instructions:
        'Answer for your usual sleep habits during the period shown above. Choose the reply that fits most often during that window.',
      questions: [
        {
          id: 'psqi_1_bed_time',
          text: 'What time have you usually gone to bed at night?',
          scaleId: 'psqi_time_bed',
        },
        {
          id: 'psqi_2_sleep_latency',
          text: 'How long (in minutes) has it usually taken you to fall asleep each night?',
          scaleId: 'psqi_sleep_latency_minutes',
        },
        {
          id: 'psqi_3_wakeup_time',
          text: 'What time have you usually gotten up in the morning?',
          scaleId: 'psqi_time_wakeup',
        },
        {
          id: 'psqi_4_sleep_hours',
          text: 'How many hours of actual sleep did you get at night?',
          scaleId: 'psqi_sleep_hours',
        },
      ],
    },
    {
      id: 'sleep_disturbances',
      title: 'Sleep Disturbances',
      instructions:
        'How often have you had trouble sleeping because you…',
      questions: [
        {
          id: 'psqi_5a_sleep_30min',
          text: 'Cannot get to sleep within 30 minutes',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5b_wake_night',
          text: 'Wake up in the middle of the night or early morning',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5c_bathroom',
          text: 'Have to get up to use the bathroom',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5d_breathe',
          text: 'Cannot breathe comfortably',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5e_cough_snore',
          text: 'Cough or snore loudly',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5f_cold',
          text: 'Feel too cold',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5g_hot',
          text: 'Feel too hot',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5h_dreams',
          text: 'Had bad dreams',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5i_pain',
          text: 'Have pain',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_5j_other_reason',
          text: 'Other reason(s) for trouble sleeping',
          scaleId: 'psqi_frequency',
        },
      ],
    },
    {
      id: 'overall_and_daytime',
      title: 'Overall Sleep and Daytime Functioning',
      instructions: 'For each item, select the one best response.',
      questions: [
        {
          id: 'psqi_6_sleep_quality',
          text: 'How would you rate your sleep quality overall?',
          scaleId: 'psqi_sleep_quality',
        },
        {
          id: 'psqi_7_sleep_medicine',
          text: 'How often have you taken medicine to help you sleep (prescribed or over the counter)?',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_8_staying_awake',
          text: 'How often have you had trouble staying awake while driving, eating meals, or engaging in social activity?',
          scaleId: 'psqi_frequency',
        },
        {
          id: 'psqi_9_enthusiasm',
          text: 'How much of a problem has it been for you to keep up enough enthusiasm to get things done?',
          scaleId: 'psqi_daytime_problem',
        },
      ],
    },
    {
      id: 'bed_partner_report',
      title: 'Bed Partner or Room Mate Report',
      instructions:
        'If you have a room mate or bed partner, ask how often you have had each of the following during the period shown above.',
      questions: [
        {
          id: 'psqi_10_bed_partner',
          text: 'Do you have a bed partner or room mate?',
          scaleId: 'psqi_bed_partner',
        },
        {
          id: 'psqi_11a_loud_snoring',
          text: 'Loud snoring',
          scaleId: 'psqi_frequency',
          showIf: {
            anyOf: [
              { questionId: 'psqi_10_bed_partner', equals: 1 },
              { questionId: 'psqi_10_bed_partner', equals: 2 },
              { questionId: 'psqi_10_bed_partner', equals: 3 },
            ],
          },
        },
        {
          id: 'psqi_11b_pauses_breathing',
          text: 'Long pauses between breaths while asleep',
          scaleId: 'psqi_frequency',
          showIf: {
            anyOf: [
              { questionId: 'psqi_10_bed_partner', equals: 1 },
              { questionId: 'psqi_10_bed_partner', equals: 2 },
              { questionId: 'psqi_10_bed_partner', equals: 3 },
            ],
          },
        },
        {
          id: 'psqi_11c_legs_twitching',
          text: 'Legs twitching or jerking while you sleep',
          scaleId: 'psqi_frequency',
          showIf: {
            anyOf: [
              { questionId: 'psqi_10_bed_partner', equals: 1 },
              { questionId: 'psqi_10_bed_partner', equals: 2 },
              { questionId: 'psqi_10_bed_partner', equals: 3 },
            ],
          },
        },
        {
          id: 'psqi_11d_disorientation',
          text: 'Episodes of disorientation or confusion during sleep',
          scaleId: 'psqi_frequency',
          showIf: {
            anyOf: [
              { questionId: 'psqi_10_bed_partner', equals: 1 },
              { questionId: 'psqi_10_bed_partner', equals: 2 },
              { questionId: 'psqi_10_bed_partner', equals: 3 },
            ],
          },
        },
        {
          id: 'psqi_11e_other_restlessness',
          text: 'Other restlessness while you sleep',
          scaleId: 'psqi_frequency',
          showIf: {
            anyOf: [
              { questionId: 'psqi_10_bed_partner', equals: 1 },
              { questionId: 'psqi_10_bed_partner', equals: 2 },
              { questionId: 'psqi_10_bed_partner', equals: 3 },
            ],
          },
        },
      ],
    },
  ],
};
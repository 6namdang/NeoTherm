import type { ScaleQuestionnaireForm } from "./types";

/** Life Impact Burn Recovery Evaluation (LIBRE): patient-reported outcome instrument. */
export const LIBRE_FORM: ScaleQuestionnaireForm = {
  id: "libre_v1",
  name: "LIBRE",
  description:
    "Life Impact Burn Recovery Evaluation",
  assignmentWeeklyFullDays: [6],
  scales: {
    agreement: {
      labels: [
        "Strongly Disagree",
        "Disagree",
        "Neither Agree nor Disagree",
        "Agree",
        "Strongly Agree",
      ],
    },
    frequency: {
      labels: ["Never", "Almost Never", "Sometimes", "Often", "Always"],
    },
    intensity: {
      labels: ["Not at All", "A Little Bit", "Somewhat", "Quite a Bit", "A Lot"],
    },
    yesno: {
      labels: ["No", "Yes"],
    },
  },
  sections: [
    {
      id: "work",
      title: "Work & Employment",
      questions: [
        {
          id: "work_screening",
          text: "Are you currently working for pay?",
          scaleId: "yesno",
        },
        {
          id: "work_1",
          text: "Because of my burns, I am unable to finish many work tasks",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_2",
          text: "I can keep up with my work responsibilities",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_3",
          text: "I am satisfied with how much I can do at my job",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_4",
          text: "Compared to others, I am limited in the amount of work I can do",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_5",
          text: "I have enough energy to complete my work",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_6",
          text: "I get tired too quickly at my job",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_7",
          text: "At my job, I can do everything for work that I want to do",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_8",
          text: "I am satisfied with my work",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_9",
          text: "My emotions make it difficult for me to go to work",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
        {
          id: "work_10",
          text: "I get unwanted attention from my coworkers",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "work_screening", equals: 1 }] },
        },
      ],
    },
    {
      id: "romantic",
      title: "Romantic Relationships",
      questions: [
        {
          id: "romantic_screening",
          text: "Are you currently in a romantic relationship?",
          scaleId: "yesno",
        },
        {
          id: "romantic_1",
          text: "Things between my partner and me are going well",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_2",
          text: "My partner is very loving to me",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_3",
          text: "My partner makes me happy",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_4",
          text: "I have a partner who meets many of my emotional needs",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_5",
          text: "I am comfortable talking openly with my partner",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_6",
          text: "My partner makes me feel needed",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_7",
          text: "I trust my partner with my deepest thoughts and feelings",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_8",
          text: "My partner is fun to be with",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_9",
          text: "My partner gets on my nerves all of the time",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
        {
          id: "romantic_10",
          text: "I am afraid to share with my partner what I dislike about myself",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "romantic_screening", equals: 1 }] },
        },
      ],
    },
    {
      id: "sexual",
      title: "Sexual Relationships",
      questions: [
        {
          id: "sexual_screening",
          text: "Are you currently sexually active?",
          scaleId: "yesno",
        },
        {
          id: "sexual_1",
          text: "Sex is fun for me",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_2",
          text: "I avoid sexual contact because of my burns",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_3",
          text: "I am not interested in sex anymore",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_4",
          text: "I have trouble becoming sexually excited",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_5",
          text: "I think that my partner enjoys our sex life",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_6",
          text: "I am satisfied with the amount of emotional closeness during sexual activity",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_7",
          text: "I am able to do the kinds of sexual activities that I like",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_8",
          text: "I feel that our sex life really adds a lot to our relationship",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_9",
          text: "I think nobody finds me sexually attractive",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
        {
          id: "sexual_10",
          text: "I am satisfied with my frequency of sexual activity",
          scaleId: "agreement",
          showIf: { anyOf: [{ questionId: "sexual_screening", equals: 1 }] },
        },
      ],
    },
    {
      id: "family_friends",
      title: "Relationship with Family & Friends",
      questions: [
        {
          id: "family_1",
          text: "Members of my family give me the support that I need",
          scaleId: "agreement",
        },
        {
          id: "family_2",
          text: "I don't like the way most family members act around me",
          scaleId: "agreement",
        },
        {
          id: "family_3",
          text: "Most family members are comfortable being with me",
          scaleId: "agreement",
        },
        {
          id: "family_4",
          text: "Members of my family enjoy meeting my friends",
          scaleId: "agreement",
        },
        {
          id: "family_5",
          text: "I don't get along with my family",
          scaleId: "agreement",
        },
        {
          id: "family_6",
          text: "I am comfortable being helped by my family",
          scaleId: "agreement",
        },
        {
          id: "family_7",
          text: "I have many friends in the city where I live",
          scaleId: "agreement",
        },
        {
          id: "family_8",
          text: "My family is comfortable talking about burns",
          scaleId: "agreement",
        },
        {
          id: "family_9",
          text: "As much as possible, I avoid members of my family",
          scaleId: "frequency",
        },
        {
          id: "family_10",
          text: "I would rather be alone than with my family",
          scaleId: "frequency",
        },
      ],
    },
    {
      id: "social_interactions",
      title: "Social Interactions",
      questions: [
        {
          id: "social_int_1",
          text: "I don't worry about other people's attitudes towards me",
          scaleId: "agreement",
        },
        {
          id: "social_int_2",
          text: "I am upset when strangers comment on my burns",
          scaleId: "agreement",
        },
        {
          id: "social_int_3",
          text: "I can help strangers feel comfortable around me",
          scaleId: "agreement",
        },
        {
          id: "social_int_4",
          text: "Because of my burns, I feel uncomfortable in social situations",
          scaleId: "frequency",
        },
        {
          id: "social_int_5",
          text: "Because of how my burns look, I am uncomfortable when I meet new people",
          scaleId: "frequency",
        },
        {
          id: "social_int_6",
          text: "Because of my burns, I am uncomfortable around strangers",
          scaleId: "frequency",
        },
        {
          id: "social_int_7",
          text: "I avoid doing things that might call attention to my burns",
          scaleId: "frequency",
        },
        {
          id: "social_int_8",
          text: "I feel embarrassed about my burns",
          scaleId: "frequency",
        },
        {
          id: "social_int_9",
          text: "I limit my activities because of how my burns look",
          scaleId: "frequency",
        },
        {
          id: "social_int_10",
          text: "I feel like I don't fit in with other people",
          scaleId: "frequency",
        },
      ],
    },
    {
      id: "social_activities",
      title: "Social Activities",
      questions: [
        {
          id: "social_act_1",
          text: "I am limited in what I can do for my family",
          scaleId: "agreement",
        },
        {
          id: "social_act_2",
          text: "I avoid outdoor activities because of my burns",
          scaleId: "agreement",
        },
        {
          id: "social_act_3",
          text: "I am able to do all of my regular family activities",
          scaleId: "frequency",
        },
        {
          id: "social_act_4",
          text: "I am able to socialize with my friends",
          scaleId: "frequency",
        },
        {
          id: "social_act_5",
          text: "I am upset that my burns limit what I can do with friends",
          scaleId: "intensity",
        },
        {
          id: "social_act_6",
          text: "I am disappointed in my ability to do leisure activities",
          scaleId: "intensity",
        },
        {
          id: "social_act_7",
          text: "My burns limit me being active",
          scaleId: "intensity",
        },
        {
          id: "social_act_8",
          text: "I tire easily when I go out with friends",
          scaleId: "intensity",
        },
        {
          id: "social_act_9",
          text: "How much do you enjoy your social life?",
          scaleId: "intensity",
        },
        {
          id: "social_act_10",
          text: "I am satisfied with my ability to do things for my friends",
          scaleId: "intensity",
        },
      ],
    },
  ],
};

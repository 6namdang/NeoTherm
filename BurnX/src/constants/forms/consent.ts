/** Legal/consent payload. Stored as POST /form-responses with form_id CONSENT_VERSION */

export type ConsentCheckboxCopy = {
  id: string;
  label: string;
  required: boolean;
};

/** Ionicons glyph name. Keep in sync with `@expo/vector-icons/Ionicons` usage in UI. */
export type ConsentBulletIcon =
  | "options-outline"
  | "flask-outline"
  | "people-outline";

export type ConsentControlBullet = {
  icon: ConsentBulletIcon;
  text: string;
};

/** Single-screen consent presentation (copy only; layout lives in UI). */
export type ConsentContent = {
  version: string;
  /** Large centered headline. Avoid repeating the app trademark. */
  headline: string;
  /** One-line partner / program context under the headline. */
  partnerLine: string;
  /** Short centered paragraphs (privacy + program facts). */
  paragraphs: readonly string[];
  /** Left-aligned icon bullets (replacing a long prose line about user control). */
  controlSection: {
    title: string;
    bullets: readonly ConsentControlBullet[];
  };
  optionalLearnMore?: {
    label: string;
    url: string;
  };
  /** Line above acknowledgment checkboxes. */
  agreementsIntro: string;
  consentCheckboxes: readonly ConsentCheckboxCopy[];
};

export const CONSENT_VERSION = "consent_v1" as const;

export const CONSENT_CONTENT: ConsentContent = {
  version: CONSENT_VERSION,
  headline: "Your health information is private and secure",
  partnerLine: "Burn & Trauma Recovery Program · Massachusetts General Hospital",
  paragraphs: [
    "To protect your privacy, sensitive information is safeguarded while you use this application. Data is transmitted over encrypted connections to systems approved by your care organization.",
    "Information you share supports your clinical team’s monitoring of recovery. Personally identifying data is never sold and is handled under policies that apply to clinical and research partnerships you approve below.",
  ],
  controlSection: {
    title: "You stay in control",
    bullets: [
      {
        icon: "options-outline",
        text: "You choose what consent you give",
      },
      {
        icon: "flask-outline",
        text: "Optional anonymized research use is available only if you opt in",
      },
      {
        icon: "people-outline",
        text: "You can update or withdraw those choices with guidance from your clinical team",
      },
    ],
  },
  optionalLearnMore: {
    label: "Learn more about this study",
    url: "https://www.massgeneral.org/",
  },
  agreementsIntro:
    "Please confirm the following before you continue using the recovery program:",
  consentCheckboxes: [
    {
      id: "consent_share",
      label: "I consent to share my data with my care team",
      required: true,
    },
    {
      id: "consent_research",
      label: "I consent to anonymized data being used for research (optional)",
      required: false,
    },
  ],
};

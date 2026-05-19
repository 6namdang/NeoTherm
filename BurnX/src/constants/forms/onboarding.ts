export type Question =
  | { id: string; type: 'text'; label: string; required?: boolean; helpText?: string; placeholder?: string; multiline?: boolean; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'number'; label: string; required?: boolean; helpText?: string; min?: number; max?: number; unit?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'date'; label: string; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'time'; label: string; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'single_select'; label: string; options: string[]; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'multi_select'; label: string; options: string[]; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'scale'; label: string; min: number; max: number; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'boolean'; label: string; required?: boolean; helpText?: string; dependsOn?: { question: string; equals: string } }
  | { id: string; type: 'hospital_picker'; label: string; required?: boolean; helpText?: string };

export type Section = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};

export type Form = {
  id: string;
  title: string;
  description?: string;
  sections: Section[];
};

// PATIENT ONBOARDING: fields needed for the users table row
export const PATIENT_ONBOARDING_FORM: Form = {
  id: 'patient_onboarding_v1',
  title: 'Your profile',
  description: 'Add your name and hospital so your burn team recognizes your account.',
  sections: [
    {
      id: 'identity',
      title: 'Your details',
      questions: [
        { id: 'name', type: 'text', label: 'Full legal name', required: true, placeholder: 'Taylor M. Reyes' },
        { id: 'hospital_id', type: 'hospital_picker', label: 'Burn center treating you', required: true },
      ],
    },
  ],
};

// DOCTOR ONBOARDING: placeholder for later
export const DOCTOR_ONBOARDING_FORM: Form = {
  id: 'doctor_onboarding_v1',
  title: 'Clinician profile',
  description: 'Tell us where you practice so we route you correctly in the clinician app.',
  sections: [
    {
      id: 'identity',
      title: 'Your credentials',
      questions: [
        { id: 'name', type: 'text', label: 'Name as licensed', required: true, placeholder: 'Sarah Chen, MD' },
        { id: 'hospital_id', type: 'hospital_picker', label: 'Main hospital affiliation', required: true },
        { id: 'title', type: 'single_select', label: 'Clinical title', options: ['MD', 'DO', 'NP', 'PA', 'RN', 'Other'], required: true },
        { id: 'specialty', type: 'text', label: 'Specialty', required: true, placeholder: 'Burn & reconstructive surgery' },
        { id: 'department', type: 'text', label: 'Department (optional)', required: false, placeholder: 'Surgical ICU' },
      ],
    },
  ],
};

// BURN INTAKE: your existing form
export const BURN_INTAKE_FORM: Form = {
  id: 'burn_intake_v1',
  title: 'Burn questionnaires',
  description: 'Answers go to your providers to help guide your care, not an emergency line. Call 911 or your hospital if symptoms are severe.',
  sections: [
    {
      id: 'about_you',
      title: 'About you',
      questions: [
        { id: 'date_of_birth', type: 'date', label: 'Date of birth', required: true },
        { id: 'sex', type: 'single_select', label: 'Sex assigned at birth', options: ['Female', 'Male', 'Intersex', 'Prefer not to say'], required: true },
        { id: 'weight_kg', type: 'number', label: 'Weight (kg)', required: true, unit: 'kg' },
        { id: 'height_cm', type: 'number', label: 'Height (cm)', required: false, unit: 'cm' },
        { id: 'pregnant', type: 'single_select', label: 'Are you currently pregnant?', options: ['No', 'Yes', 'Unsure', 'Not applicable'], required: true },
      ],
    },
    {
      id: 'injury_details',
      title: 'The injury',
      questions: [
        { id: 'injury_date', type: 'date', label: 'When did the burn happen?', required: true },
        { id: 'injury_time', type: 'time', label: 'Approximate time', required: false },
        {
          id: 'cause',
          type: 'single_select',
          label: 'What caused the burn?',
          options: ['Fire / flame', 'Hot liquid (scald)', 'Hot surface / contact', 'Steam', 'Chemical', 'Electrical', 'Friction', 'Sun / radiation', 'Other'],
          required: true,
        },
        { id: 'cause_other', type: 'text', label: 'If other, please describe', required: false, multiline: true, dependsOn: { question: 'cause', equals: 'Other' } },
        {
          id: 'location_enclosed_space',
          type: 'single_select',
          label: 'Did the burn happen in an enclosed space (e.g. building, vehicle)?',
          options: ['Yes', 'No', 'Unsure'],
          helpText: 'This helps assess inhalation injury risk.',
          required: true,
        },
        {
          id: 'loss_of_consciousness',
          type: 'single_select',
          label: 'Did you lose consciousness at any point?',
          options: ['No', 'Yes, briefly', 'Yes, for several minutes or longer', 'Unsure'],
          required: true,
        },
      ],
    },
    {
      id: 'affected_areas',
      title: 'Burn location',
      questions: [
        {
          id: 'body_areas',
          type: 'multi_select',
          label: 'Select all areas with burns',
          options: ['Face', 'Neck', 'Chest', 'Back', 'Abdomen', 'Right arm', 'Left arm', 'Right hand', 'Left hand', 'Genitals / groin', 'Right leg', 'Left leg', 'Right foot', 'Left foot'],
          required: true,
        },
        {
          id: 'critical_areas',
          type: 'multi_select',
          label: 'Are any of these areas affected? (select all that apply)',
          options: ['Eyes', 'Mouth or inside throat', 'Across a joint (elbow, knee, etc.)', 'None of these'],
          helpText: 'Burns to these areas often need specialist care.',
          required: true,
        },
        {
          id: 'estimated_size',
          type: 'single_select',
          label: 'Roughly, how much of your body is burned?',
          options: ['Smaller than my palm', 'Size of one arm', 'Size of two arms or one leg', 'More than that', "I'm not sure"],
          required: true,
        },
      ],
    },
    {
      id: 'symptoms',
      title: 'How you feel now',
      questions: [
        { id: 'pain_level', type: 'scale', label: 'Pain right now (0 = none, 10 = worst imaginable)', min: 0, max: 10, required: true },
        {
          id: 'breathing',
          type: 'multi_select',
          label: 'Any breathing issues? (select all that apply)',
          options: ['Coughing', 'Hoarse voice', 'Wheezing or noisy breathing', 'Shortness of breath', 'Soot in mouth or nose', 'None of these'],
          required: true,
        },
        {
          id: 'wound_appearance',
          type: 'multi_select',
          label: 'How does the burn look? (select all that apply)',
          options: ['Red', 'Blistered', 'Wet or weeping', 'White or waxy', 'Black or charred', 'Numb to the touch', 'Painful to touch'],
          required: true,
        },
        {
          id: 'other_symptoms',
          type: 'multi_select',
          label: 'Any of the following?',
          options: ['Fever or chills', 'Nausea or vomiting', 'Dizziness', 'Confusion', 'Increased thirst', 'Reduced urination', 'None of these'],
          required: true,
        },
      ],
    },
    {
      id: 'first_aid',
      title: 'First aid',
      questions: [
        {
          id: 'first_aid_actions',
          type: 'multi_select',
          label: 'What first aid was given? (select all that apply)',
          options: ['Cool running water', 'Ice or ice pack', 'Cloth or bandage', 'Burn cream / ointment', 'Home remedy (toothpaste, butter, etc.)', 'Nothing yet'],
          required: true,
        },
        { id: 'time_to_first_aid', type: 'single_select', label: 'How soon after the burn was first aid started?', options: ['Within minutes', 'Within 30 minutes', 'Within a few hours', 'Later than that', 'No first aid'], required: true },
        { id: 'medications_taken', type: 'text', label: 'Any pain medication or other medication taken? (name and time)', required: false, multiline: true },
      ],
    },
    {
      id: 'medical_history',
      title: 'Health history',
      questions: [
        {
          id: 'chronic_conditions',
          type: 'multi_select',
          label: 'Do you have any of these conditions?',
          options: ['Diabetes', 'Heart disease', 'Lung disease (asthma, COPD)', 'Kidney disease', 'Liver disease', 'Immune condition', 'Bleeding or clotting disorder', 'None of these'],
          required: true,
        },
        { id: 'current_medications', type: 'text', label: 'List medications you take regularly', required: false, multiline: true },
        { id: 'allergies', type: 'text', label: 'Any allergies (medications, latex, foods)?', required: false, multiline: true },
        { id: 'tetanus_recent', type: 'single_select', label: 'Last tetanus shot?', options: ['Within last 5 years', '5 to 10 years ago', 'More than 10 years ago', "Don't know"], required: true },
        { id: 'smoker', type: 'single_select', label: 'Do you smoke?', options: ['No, never', 'Former smoker', 'Currently smoke'], required: true },
      ],
    },
    {
      id: 'consent',
      title: 'Consent',
      questions: [
        { id: 'consent_share', type: 'boolean', label: 'I agree to share these answers with the burn center I selected.', required: true },
        { id: 'consent_research', type: 'boolean', label: 'Optional: I agree that answers with identifying details removed may be used for approved quality improvement or research.', required: false },
      ],
    },
  ],
};
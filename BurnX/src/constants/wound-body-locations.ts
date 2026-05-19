/** Values sent to POST /wound-images as `body_location`. */
export const WOUND_BODY_LOCATIONS = [
  { value: "head_face", label: "Head / face" },
  { value: "neck", label: "Neck" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "arm_left", label: "Arm (left)" },
  { value: "arm_right", label: "Arm (right)" },
  { value: "hand_left", label: "Hand (left)" },
  { value: "hand_right", label: "Hand (right)" },
  { value: "leg_left", label: "Leg (left)" },
  { value: "leg_right", label: "Leg (right)" },
  { value: "foot_left", label: "Foot (left)" },
  { value: "foot_right", label: "Foot (right)" },
  { value: "abdomen", label: "Abdomen" },
  { value: "other", label: "Other" },
] as const;

export type WoundBodyLocationValue = (typeof WOUND_BODY_LOCATIONS)[number]["value"];

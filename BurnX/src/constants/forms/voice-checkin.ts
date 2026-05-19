import type { VoiceCheckinForm } from "./types";

export const VOICE_CHECKIN_FORM: VoiceCheckinForm = {
  id: "voice_checkin_v1",
  name: "Voice Check-In",
  description: "Brief voice recording to track recovery.",
  assignmentDaysOfWeek: [1, 3, 5],
  assignmentTimeOfDay: { hour: 10, minute: 0 },
  type: "voice",
  tasks: [
    {
      id: "task_1_sustained_a",
      label: 'Sustained "ahhh"',
      instruction: "Hold the note steady",
      durationMs: 5000,
    },
    {
      id: "task_2_pataka",
      label: "Pa-ta-ka",
      instruction: 'Say "pa-ta-ka" as fast and clearly as you can',
      durationMs: 10000,
    },
    {
      id: "task_3_p_words",
      label: "P words",
      instruction: "Name as many words starting with P as you can",
      durationMs: 10000,
    },
    {
      id: "task_4_animals",
      label: "Animals",
      instruction: "Name as many animals as you can",
      durationMs: 10000,
    },
  ],
};

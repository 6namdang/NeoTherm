export type FormScheduleSlot = {
  slot_id: string;
  form_ids: string[];
  local_open_time: string;
  local_close_time: string;
  n1_utc: string;
  n2_utc: string;
  n3_utc: string;
};

export type FormScheduleResponse = {
  date: string;
  slots: FormScheduleSlot[];
  n4_audit_utc: string;
};

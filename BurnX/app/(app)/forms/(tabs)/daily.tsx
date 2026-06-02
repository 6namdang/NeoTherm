import { DAILY_FORM_IDS } from "../../../../src/lib/care-program-form-groups";
import { CareProgramsTabScreen } from "../../../../src/components/assignments/CareProgramsTabScreen";

export default function DailyAssignmentsTab() {
  return (
    <CareProgramsTabScreen
      eyebrow="Daily"
      emptySubtitle="Daily check-ins appear here when they open throughout the day."
      formIds={DAILY_FORM_IDS}
      subtitle="Sleep, pain, and mood check-ins open at set times each day until 11:59 PM."
      title="Daily check-ins"
    />
  );
}

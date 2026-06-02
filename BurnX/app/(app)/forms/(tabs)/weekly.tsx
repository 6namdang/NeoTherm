import { WEEKLY_FORM_IDS } from "../../../../src/lib/care-program-form-groups";
import { CareProgramsTabScreen } from "../../../../src/components/assignments/CareProgramsTabScreen";

export default function WeeklyAssignmentsTab() {
  return (
    <CareProgramsTabScreen
      eyebrow="Weekly"
      emptySubtitle="LIBRE opens on Saturdays. Completed weeks will not appear here until the next window."
      formIds={WEEKLY_FORM_IDS}
      subtitle="LIBRE on Saturdays; MoCA trail prototype is listed here temporarily for tap testing."
      title="LIBRE"
    />
  );
}

import { WEEKLY_FORM_IDS } from "../../../../src/lib/care-program-form-groups";
import { CareProgramsTabScreen } from "../../../../src/components/assignments/CareProgramsTabScreen";
import { isMocaStandaloneTestingEnabled } from "../../../../src/constants/forms/moca";

export default function WeeklyAssignmentsTab() {
  return (
    <CareProgramsTabScreen
      eyebrow="Weekly"
      emptySubtitle={
        isMocaStandaloneTestingEnabled()
          ? "LIBRE opens on Saturdays. MoCA is listed here temporarily for full device testing."
          : "LIBRE opens on Saturdays. Completed weeks will not appear here until the next window."
      }
      formIds={WEEKLY_FORM_IDS}
      subtitle={
        isMocaStandaloneTestingEnabled()
          ? "LIBRE on Saturdays; MoCA is always available here for testing (temporary)."
          : "LIBRE on Saturdays."
      }
      title={isMocaStandaloneTestingEnabled() ? "Weekly & MoCA testing" : "LIBRE"}
    />
  );
}

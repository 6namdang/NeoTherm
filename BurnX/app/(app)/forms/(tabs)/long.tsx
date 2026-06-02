import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { LONG_ASSESSMENT_BUNDLE_ID } from "../../../../src/lib/care-program-form-groups";
import { CareProgramsTabScreen } from "../../../../src/components/assignments/CareProgramsTabScreen";
import { getOnboardingSubmittedAt } from "../../../../src/lib/burn-date";
import {
  buildLongAssessmentTabEmptySubtitle,
  buildLongAssessmentTabSubtitle,
  resolveLongAssessmentState,
} from "../../../../src/lib/long-assessment-eligibility";
import { fetchLongAssessmentLastCompletions } from "../../../../src/lib/long-assessment-resolve";

const DEFAULT_SUBTITLE =
  "Pain, sleep, fatigue, and mental health questionnaires bundled for each 30-day program milestone.";
const DEFAULT_EMPTY_SUBTITLE =
  "Your Long Assessment opens on program Day 30, 60, 90, and every 30 days after that — today only, no carryover.";

export default function LongAssignmentsTab() {
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [emptySubtitle, setEmptySubtitle] = useState(DEFAULT_EMPTY_SUBTITLE);

  const refreshScheduleCopy = useCallback(async () => {
    try {
      const [onboardingSubmittedAt, lastCompletions] = await Promise.all([
        getOnboardingSubmittedAt(),
        fetchLongAssessmentLastCompletions(),
      ]);
      const snap = resolveLongAssessmentState({
        onboardingSubmittedAt,
        lastCompletions,
      });
      setSubtitle(
        buildLongAssessmentTabSubtitle(onboardingSubmittedAt, snap),
      );
      setEmptySubtitle(
        buildLongAssessmentTabEmptySubtitle(onboardingSubmittedAt, snap),
      );
    } catch {
      setSubtitle(DEFAULT_SUBTITLE);
      setEmptySubtitle(DEFAULT_EMPTY_SUBTITLE);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshScheduleCopy();
    }, [refreshScheduleCopy]),
  );

  return (
    <CareProgramsTabScreen
      eyebrow="Long assessment"
      emptySubtitle={emptySubtitle}
      formIds={[LONG_ASSESSMENT_BUNDLE_ID]}
      onScheduleRefresh={refreshScheduleCopy}
      subtitle={subtitle}
      title="Long Assessment"
    />
  );
}

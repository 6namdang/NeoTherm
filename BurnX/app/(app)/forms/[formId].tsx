import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { ScaleFormRunner } from "../../../src/components/forms/ScaleFormRunner";
import { useToast } from "../../../src/components/ToastProvider";
import { getFormById } from "../../../src/constants/forms";
import { isEmaFormId } from "../../../src/constants/ema-forms";
import {
  buildFormRecallPeriodLabel,
  getBurnInjuryDate,
  getLastCompletion,
} from "../../../src/lib/burn-date";
import {
  careProgramsTabHrefForFormId,
  isLongAssessmentMemberFormId,
  mocaFormHref,
} from "../../../src/lib/care-program-form-groups";
import { MOCA_FORM_ID, isMocaStandaloneTestingEnabled } from "../../../src/constants/forms/moca";
import { bxLog } from "../../../src/lib/debug-log";
import {
  persistAssignmentSubmissionClientTime,
  resolveAssignmentSnapshot,
} from "../../../src/lib/form-assignment-eligibility";
import { clearEmaTodayState } from "../../../src/lib/ema-today-state";
import {
  bootstrapLongAssessmentSession,
  hasActiveLongAssessmentSession,
} from "../../../src/lib/long-assessment-session";
import { refreshSchedules } from "../../../src/lib/notifications-engine";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";

export default function FormRunnerScreen() {
  const params = useLocalSearchParams<{ formId?: string | string[] }>();
  const { showToast } = useToast();
  const formId = Array.isArray(params.formId)
    ? params.formId[0] ?? ""
    : params.formId ?? "";

  const formDef = useMemo(
    () => (formId ? getFormById(formId) : undefined),
    [formId],
  );

  const [headerLine, setHeaderLine] = useState("");
  const [booting, setBooting] = useState(() => Boolean(formDef));
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setHeaderLine("");
    setBooting(Boolean(formDef));
    setAllowed(false);
  }, [formId, formDef]);

  useEffect(() => {
    if (!formDef) {
      setBooting(false);
      return;
    }

    let cancelled = false;

    (async () => {
      if (formId === MOCA_FORM_ID && isMocaStandaloneTestingEnabled()) {
        router.replace(mocaFormHref());
        return;
      }

      if (isLongAssessmentMemberFormId(formId)) {
        const boot = await bootstrapLongAssessmentSession();
        const active = await hasActiveLongAssessmentSession(boot.snap.programDay);
        if (cancelled) return;
        if (!boot.snap.dueToday || !active) {
          router.replace("/forms/long" as Href);
          return;
        }
        setAllowed(true);
        const injuryDate = await getBurnInjuryDate();
        const last = await getLastCompletion(formId);
        if (!cancelled) {
          setHeaderLine(buildFormRecallPeriodLabel(injuryDate, last));
          setBooting(false);
        }
        return;
      }

      const snap = await resolveAssignmentSnapshot(formId);
      if (cancelled) return;
      if (!snap.pending) {
        router.replace(careProgramsTabHrefForFormId(formId));
        return;
      }
      setAllowed(true);
      setHeaderLine(
        buildFormRecallPeriodLabel(snap.injuryDate, snap.lastCompletedAt),
      );
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [formId, formDef]);

  if (!formDef) {
    return (
      <Screen animateEntry preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader
          title="Not available"
          subtitle="This instrument is not enabled for your account yet. Return to the home tab or contact your care team."
          onBackPress={() =>
            router.replace(
              formId
                ? careProgramsTabHrefForFormId(formId)
                : ("/forms/daily" as Href),
            )
          }
        />
      </Screen>
    );
  }

  if (booting || !allowed) {
    return (
      <Screen animateEntry preset="stack" scroll={false}>
        <StatusBar style="dark" />
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen animateEntry preset="stack" scroll>
      <StatusBar style="dark" />
      <PageHeader
        title={formDef.name}
        eyebrow="Care programs"
        subtitle={formDef.description || undefined}
        onBackPress={() => router.replace(careProgramsTabHrefForFormId(formId))}
      />
      <ScaleFormRunner
        formId={formId}
        headerLine={headerLine}
        onBackAtStart={() => router.replace(careProgramsTabHrefForFormId(formId))}
        onSubmitted={async () => {
          try {
            await persistAssignmentSubmissionClientTime(formDef.id);
          } catch (cacheErr) {
            bxLog("forms", "cache write failed (non-fatal)", { formId, cacheErr });
          }

          if (isEmaFormId(formDef.id)) {
            clearEmaTodayState();
            void refreshSchedules();
          }

          showToast("Your responses were saved.", "success");
          router.replace(careProgramsTabHrefForFormId(formDef.id));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    minHeight: 200,
  },
});

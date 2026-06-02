import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useFocusEffect, type Href } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { Button } from "../../../src/components/Button";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import { ScaleFormRunner } from "../../../src/components/forms/ScaleFormRunner";
import { MocaFormRunner } from "../../../src/components/forms/moca/MocaFormRunner";
import { LONG_ASSESSMENT_FORM } from "../../../src/constants/forms/long-assessment";
import { MOCA_FORM_ID } from "../../../src/constants/forms/moca";
import { buildFormRecallPeriodLabel, getBurnInjuryDate, getLastCompletion } from "../../../src/lib/burn-date";
import {
  LONG_FORM_IDS,
} from "../../../src/lib/care-program-form-groups";
import { getFormById } from "../../../src/constants/forms";
import {
  bootstrapLongAssessmentSession,
  markLongAssessmentFormComplete,
  startLongAssessmentSession,
} from "../../../src/lib/long-assessment-session";
import type { LongAssessmentSnapshot } from "../../../src/lib/long-assessment-eligibility";
import { persistAssignmentSubmissionClientTime } from "../../../src/lib/form-assignment-eligibility";
import { bxLog } from "../../../src/lib/debug-log";
import { colors } from "../../../src/theme/colors";
import { spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

type Phase = "loading" | "intro" | "running" | "complete";

function sectionLabel(formId: string, index: number, total: number): string {
  const name = getFormById(formId)?.name ?? formId;
  return `Section ${index + 1} of ${total} · ${name}`;
}

export default function LongAssessmentScreen() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [snap, setSnap] = useState<LongAssessmentSnapshot | null>(null);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [headerLine, setHeaderLine] = useState("");

  const totalSections = LONG_FORM_IDS.length;
  const activeIndex = activeFormId
    ? LONG_FORM_IDS.indexOf(activeFormId as (typeof LONG_FORM_IDS)[number])
    : -1;

  const blockExit = phase === "running";

  usePreventRemove(blockExit, () => {
    /* Navigation back is blocked until the Long Assessment is complete. */
  });

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => blockExit);
      return () => sub.remove();
    }, [blockExit]),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const boot = await bootstrapLongAssessmentSession();
      if (cancelled) return;
      setSnap(boot.snap);

      if (!boot.snap.dueToday || !boot.snap.pending) {
        router.replace("/forms/long" as Href);
        return;
      }

      if (boot.session?.activeFormId) {
        setActiveFormId(boot.session.activeFormId);
        setPhase("running");
      } else {
        setPhase("intro");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeFormId) return;
    void (async () => {
      const injuryDate = await getBurnInjuryDate();
      const last = await getLastCompletion(activeFormId);
      setHeaderLine(buildFormRecallPeriodLabel(injuryDate, last));
    })();
  }, [activeFormId]);

  async function onStart(): Promise<void> {
    if (!snap) return;
    const nextSession = await startLongAssessmentSession(snap);
    if (!nextSession?.activeFormId) {
      router.replace("/forms/long" as Href);
      return;
    }
    setActiveFormId(nextSession.activeFormId);
    setPhase("running");
  }

  async function onInstrumentSubmitted(formId: string): Promise<void> {
    if (!snap?.programDay) return;
    try {
      await persistAssignmentSubmissionClientTime(formId);
    } catch (cacheErr) {
      bxLog("forms", "cache write failed (non-fatal)", { formId, cacheErr });
    }

    await markLongAssessmentFormComplete(formId, snap.programDay);

    const refreshed = await bootstrapLongAssessmentSession();
    setSnap(refreshed.snap);

    if (!refreshed.snap.pending) {
      setPhase("complete");
      setActiveFormId(null);
      return;
    }

    const nextFormId =
      refreshed.session?.activeFormId ??
      refreshed.snap.remainingFormIds[0] ??
      null;
    if (!nextFormId) {
      setPhase("complete");
      setActiveFormId(null);
      return;
    }
    setActiveFormId(nextFormId);
  }

  const progressText = useMemo(() => {
    if (phase === "complete") return "All sections complete";
    const saved = snap?.completedFormIds.length ?? 0;
    if (phase === "running" && activeIndex >= 0) {
      return `${saved} of ${totalSections} sections saved · section ${activeIndex + 1} in progress`;
    }
    if (saved > 0) {
      return `${saved} of ${totalSections} sections already saved today`;
    }
    return `${totalSections} sections in today's Long Assessment`;
  }, [activeIndex, phase, snap?.completedFormIds.length, totalSections]);

  if (phase === "loading" || !snap) {
    return (
      <Screen animateEntry preset="stack" scroll={false}>
        <StatusBar style="dark" />
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (phase === "complete") {
    return (
      <Screen animateEntry preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader
          eyebrow="Long assessment"
          title="Long Assessment complete"
          subtitle={`Day ${snap.programDay ?? ""} questionnaires are saved. Thank you.`}
          onBackPress={() => router.replace("/forms/long" as Href)}
        />
        <View style={styles.completeBody}>
          <Text style={[styles.completeCopy, typography.body]}>
            Your pain, sleep, fatigue, and mental health responses were submitted
            to your care team.
          </Text>
          <Button
            title="Back to care programs"
            onPress={() => router.replace("/forms/long" as Href)}
          />
        </View>
      </Screen>
    );
  }

  if (phase === "intro") {
    return (
      <Screen animateEntry preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader
          eyebrow="Long assessment"
          title={LONG_ASSESSMENT_FORM.name}
          subtitle={`Day ${snap.programDay ?? ""} · Opens today only`}
        />
        <View style={styles.introBody}>
          <Text style={[styles.introCopy, typography.body]}>
            This bundled check-in includes {totalSections} questionnaires. You
            can pause and return today — finished sections stay saved on our
            servers. Complete every section before midnight.
          </Text>
          <Text style={[styles.progressLine, typography.caption]}>{progressText}</Text>
          <Button title="Begin Long Assessment" onPress={() => void onStart()} />
        </View>
      </Screen>
    );
  }

  if (phase === "running" && activeFormId) {
    return (
      <Screen animateEntry preset="stack" scroll>
        <StatusBar style="dark" />
        <PageHeader
          eyebrow="Long assessment"
          title={LONG_ASSESSMENT_FORM.name}
          subtitle={sectionLabel(activeFormId, activeIndex, totalSections)}
        />
        <Text style={[styles.progressLine, typography.caption]}>{progressText}</Text>
        {activeFormId === MOCA_FORM_ID ? (
          <MocaFormRunner
            onSubmitted={async () => {
              await onInstrumentSubmitted(activeFormId);
            }}
          />
        ) : (
          <ScaleFormRunner
            eyebrow={`Long assessment · Day ${snap.programDay ?? ""}`}
            formId={activeFormId}
            headerLine={headerLine}
            onBackAtStart={() => {
              /* First question — stay in session */
            }}
            onSubmitted={async () => {
              await onInstrumentSubmitted(activeFormId);
            }}
          />
        )}
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  introBody: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  introCopy: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
  progressLine: {
    color: colors.textMuted,
  },
  completeBody: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  completeCopy: {
    color: colors.textSecondary,
    lineHeight: 24,
  },
});

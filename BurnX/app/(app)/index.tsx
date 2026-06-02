import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    RefreshControl,
    StyleSheet,
    View,
    type AppStateStatus,
} from "react-native";
import { AccountSidePanel } from "../../src/components/AccountSidePanel";
import { CognitiveFunctionDashboardCard } from "../../src/components/charts/CognitiveFunctionDashboardCard";
import { FatigueScoreCard } from "../../src/components/charts/FatigueScoreCard";
import { Gad7DashboardCard } from "../../src/components/charts/Gad7DashboardCard";
import { LibreSectionalRadar } from "../../src/components/charts/LibreSectionalRadar";
import { PainIntensityScoreCard } from "../../src/components/charts/PainIntensityScoreCard";
import { PsqiSleepQualityCard } from "../../src/components/charts/PsqiSleepQualityCard";
import {
    DashboardBottomSections,
    type CareProgramHomeRow,
} from "../../src/components/DashboardBottomSections";
import { DashboardOverviewSection } from "../../src/components/DashboardOverviewSection";
import { DashboardWelcomeHeader } from "../../src/components/DashboardWelcomeHeader";
import { MassGeneralHospitalLogo } from "../../src/components/MassGeneralHospitalLogo";
import { AppleHealthSection } from "../../src/components/health/AppleHealthSection";
import { Screen } from "../../src/components/Screen";
import { VoiceAnalysisDashboardCard } from "../../src/components/voice/VoiceAnalysisDashboardCard";
import { ALL_EMA_FORMS } from "../../src/constants/ema-forms";
import { LIBRE_FORM } from "../../src/constants/forms/libre";
import { LONG_ASSESSMENT_FORM } from "../../src/constants/forms/long-assessment";
import { getMyFormResponses } from "../../src/lib/api";
import { useSession } from "../../src/lib/auth-context";
import {
  formatProgramDayLabel,
  getOnboardingSubmittedAt,
} from "../../src/lib/burn-date";
import {
    scoreCognitiveFunction,
    type CognitiveDashboardPoint,
    type CognitiveDashboardSnapshot,
} from "../../src/lib/cognitive-function-scoring";
import {
  loadTodayEmaState,
  resolveEmaPendingFromState,
} from "../../src/lib/ema-today-state";
import {
    scoreFatigue,
    type FatigueDashboardPoint,
    type FatigueDashboardSnapshot,
} from "../../src/lib/fatigue-scoring";
import { resolveAssignmentSnapshot } from "../../src/lib/form-assignment-eligibility";
import { LONG_ASSESSMENT_BUNDLE_ID } from "../../src/lib/care-program-form-groups";
import { resolveLongAssessmentSnapshot } from "../../src/lib/long-assessment-resolve";
import {
    scoreGad7,
    type Gad7DashboardPoint,
    type Gad7DashboardSnapshot,
} from "../../src/lib/gad7-scoring";
import {
    coerceAnswersRecord,
    computeLibreRadarScores,
    type LibreDashboardSubmissionSnapshot,
    type LibreRadarDomainSlice,
} from "../../src/lib/libre-scoring";
import {
    painIntensityOrdinalSnapshot,
    scorePainIntensity,
    type PainIntensityDashboardPoint,
    type PainIntensityDashboardSnapshot,
} from "../../src/lib/pain-intensity-scoring";
import { usePostAuth } from "../../src/lib/post-auth-context";
import {
  resolveLastVisitDaysAgo,
  resolveWelcomeFacility,
  resolveWelcomeRole,
} from "../../src/lib/welcome-meta";
import {
    computePsqiScores,
    estimatedSleepHoursFromQ4,
    type PsqiDashboardSubmissionSnapshot,
} from "../../src/lib/psqi-scoring";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";

const EMPTY_LIBRE = computeLibreRadarScores({});

/** Max LIBRE questionnaires to load for home radar (latest only) + detail modal paging. */
const LIBRE_FETCH_LIMIT = 48;

/** Latest PSQI completions for home visualization. */
const PSQI_FETCH_LIMIT = 24;

/** Latest Fatigue (PROMIS 7a) for home T-score card. */
const FATIGUE_FETCH_LIMIT = 24;

/** Latest pain intensity snapshots for home + history modal. */
const PAIN_INTENSITY_FETCH_LIMIT = 48;

/** Weekly / occasional screens for dashboard gauges. */
const GAD_COGNITIVE_FETCH_LIMIT = 24;

type DashboardData = {
  emaRows: CareProgramHomeRow[];
  libreDomains: LibreRadarDomainSlice[];
  libreOverall: number | null;
  libreSubmittedAtIso: string | null;
  libreSubmissionHistory: LibreDashboardSubmissionSnapshot[];
  psqiSnapshot: PsqiDashboardSubmissionSnapshot | null;
  fatigueSnapshot: FatigueDashboardSnapshot | null;
  fatigueHistory: FatigueDashboardPoint[];
  gad7Snapshot: Gad7DashboardSnapshot | null;
  gad7History: Gad7DashboardPoint[];
  cognitiveSnapshot: CognitiveDashboardSnapshot | null;
  cognitiveHistory: CognitiveDashboardPoint[];
  painIntensitySnapshot: PainIntensityDashboardSnapshot | null;
  painIntensityHistory: PainIntensityDashboardPoint[];
  careProgramRows: CareProgramHomeRow[];
};

async function fetchDashboardAws(options?: {
  forceEmaRefresh?: boolean;
}): Promise<DashboardData> {
  let librePending = true;
  let longAssessmentPending = false;
  try {
    const [libreSnap, longSnap] = await Promise.all([
      resolveAssignmentSnapshot(LIBRE_FORM.id),
      resolveLongAssessmentSnapshot(),
    ]);
    librePending = libreSnap.pending;
    longAssessmentPending = longSnap.pending;
  } catch {
    librePending = true;
    longAssessmentPending = false;
  }

  const careProgramRows: CareProgramHomeRow[] = [
    {
      id: LIBRE_FORM.id,
      title: (LIBRE_FORM.name ?? "").trim(),
      pending: librePending,
    },
    ...(longAssessmentPending
      ? [
          {
            id: LONG_ASSESSMENT_BUNDLE_ID,
            title: LONG_ASSESSMENT_FORM.name,
            pending: true,
          },
        ]
      : []),
  ];

  let emaState: Awaited<ReturnType<typeof loadTodayEmaState>> | null = null;
  try {
    emaState = await loadTodayEmaState({
      force: options?.forceEmaRefresh ?? false,
    });
  } catch {
    emaState = null;
  }

  const emaRows: CareProgramHomeRow[] = ALL_EMA_FORMS.map((f) => ({
    id: f.id,
    title: (f.name ?? "").trim(),
    pending: emaState
      ? resolveEmaPendingFromState(f.id, emaState)
      : true,
  }));

  let libreDomains = EMPTY_LIBRE.domains;
  let libreOverall = EMPTY_LIBRE.overallTScore;
  let libreSubmittedAtIso: string | null = null;
  let libreSubmissionHistory: LibreDashboardSubmissionSnapshot[] = [];

  try {
    const libreRows = await getMyFormResponses("libre_v1", LIBRE_FETCH_LIMIT);
    libreRows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    const snapshots: LibreDashboardSubmissionSnapshot[] = [];
    for (const row of libreRows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const ans = coerceAnswersRecord(
        row.answers as Record<string, unknown>,
      );
      if (ans === null || Object.keys(ans).length === 0) continue;
      const scored = computeLibreRadarScores(ans);
      snapshots.push({
        createdAtIso: createdRaw,
        domains: scored.domains,
        overallTScore: scored.overallTScore,
      });
    }
    libreSubmissionHistory = snapshots;
    const latest = snapshots[0];
    if (latest) {
      libreDomains = latest.domains;
      libreOverall = latest.overallTScore;
      libreSubmittedAtIso = latest.createdAtIso;
    }
  } catch {
    /* keep EMPTY_LIBRE */
  }

  let psqiSnapshot: PsqiDashboardSubmissionSnapshot | null = null;
  try {
    const psqiRows = await getMyFormResponses("psqi_v1", PSQI_FETCH_LIMIT);
    psqiRows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    for (const row of psqiRows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const raw = row.answers as Record<string, unknown>;
      const ans = coerceAnswersRecord(raw);
      if (ans === null || Object.keys(ans).length === 0) continue;
      const scored = computePsqiScores(ans, raw);
      if (scored === null) continue;
      psqiSnapshot = {
        createdAtIso: createdRaw,
        total: scored.total,
        domainById: scored.domainById,
        isComplete: scored.isComplete,
        sleepHours: estimatedSleepHoursFromQ4(raw.psqi_4_sleep_hours),
      };
      break;
    }
  } catch {
    psqiSnapshot = null;
  }

  let fatigueSnapshot: FatigueDashboardSnapshot | null = null;
  let fatigueHistory: FatigueDashboardPoint[] = [];
  try {
    const fatigueRows = await getMyFormResponses("fatigue_v1", FATIGUE_FETCH_LIMIT);
    fatigueRows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    const buckets: FatigueDashboardPoint[] = [];
    for (const row of fatigueRows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const ans = coerceAnswersRecord(
        row.answers as Record<string, unknown>,
      );
      if (ans === null || Object.keys(ans).length === 0) continue;
      const scored = scoreFatigue(ans);
      if (!scored.isComplete || scored.tScore === null) continue;
      const point: FatigueDashboardPoint = {
        createdAtIso: createdRaw,
        ...scored,
      };
      buckets.push(point);
      if (!fatigueSnapshot) {
        fatigueSnapshot = point;
      }
    }
    fatigueHistory = buckets;
  } catch {
    fatigueSnapshot = null;
    fatigueHistory = [];
  }

  let painIntensitySnapshot: PainIntensityDashboardSnapshot | null = null;
  let painIntensityHistory: PainIntensityDashboardPoint[] = [];
  try {
    const painRows = await getMyFormResponses(
      "pain_intensity_v1",
      PAIN_INTENSITY_FETCH_LIMIT,
    );
    painRows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    const buckets: PainIntensityDashboardPoint[] = [];
    for (const row of painRows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const ans = coerceAnswersRecord(
        row.answers as Record<string, unknown>,
      );
      if (ans === null || Object.keys(ans).length === 0) continue;
      if (!painIntensitySnapshot) {
        const promis = scorePainIntensity(ans);
        painIntensitySnapshot = {
          createdAtIso: createdRaw,
          ...promis,
        };
      }
      const ordinal = painIntensityOrdinalSnapshot(ans);
      buckets.push({ createdAtIso: createdRaw, ...ordinal });
    }
    painIntensityHistory = buckets;
  } catch {
    painIntensitySnapshot = null;
    painIntensityHistory = [];
  }

  let gad7Snapshot: Gad7DashboardSnapshot | null = null;
  let gad7History: Gad7DashboardPoint[] = [];
  try {
    const rows = await getMyFormResponses("gad7_v1", GAD_COGNITIVE_FETCH_LIMIT);
    rows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    const buckets: Gad7DashboardPoint[] = [];
    for (const row of rows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const ans = coerceAnswersRecord(
        row.answers as Record<string, unknown>,
      );
      if (ans === null || Object.keys(ans).length === 0) continue;
      const scored = scoreGad7(ans);
      if (!scored.isComplete) continue;
      const point: Gad7DashboardPoint = {
        createdAtIso: createdRaw,
        ...scored,
      };
      buckets.push(point);
      if (!gad7Snapshot) {
        gad7Snapshot = point;
      }
    }
    gad7History = buckets;
  } catch {
    gad7Snapshot = null;
    gad7History = [];
  }

  let cognitiveSnapshot: CognitiveDashboardSnapshot | null = null;
  let cognitiveHistory: CognitiveDashboardPoint[] = [];
  try {
    const rows = await getMyFormResponses(
      "cognitive_function_v1",
      GAD_COGNITIVE_FETCH_LIMIT,
    );
    rows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
    const buckets: CognitiveDashboardPoint[] = [];
    for (const row of rows) {
      const createdRaw =
        row.created_at && typeof row.created_at === "string"
          ? row.created_at.trim()
          : "";
      if (createdRaw === "") continue;
      if (!row.answers || typeof row.answers !== "object") continue;
      const ans = coerceAnswersRecord(
        row.answers as Record<string, unknown>,
      );
      if (ans === null || Object.keys(ans).length === 0) continue;
      const scored = scoreCognitiveFunction(ans);
      if (!scored.isComplete) continue;
      const point: CognitiveDashboardPoint = {
        createdAtIso: createdRaw,
        ...scored,
      };
      buckets.push(point);
      if (!cognitiveSnapshot) {
        cognitiveSnapshot = point;
      }
    }
    cognitiveHistory = buckets;
  } catch {
    cognitiveSnapshot = null;
    cognitiveHistory = [];
  }

  return {
    emaRows,
    libreDomains,
    libreOverall,
    libreSubmittedAtIso,
    libreSubmissionHistory,
    psqiSnapshot,
    fatigueSnapshot,
    fatigueHistory,
    gad7Snapshot,
    gad7History,
    cognitiveSnapshot,
    cognitiveHistory,
    painIntensitySnapshot,
    painIntensityHistory,
    careProgramRows,
  };
}

export default function HomeScreen() {
  const { me } = usePostAuth();
  const { signOut } = useSession();
  const displayName =
    typeof me?.name === "string" && me.name.trim() !== ""
      ? me.name.trim()
      : null;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [burnDayLabel, setBurnDayLabel] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const hydrate = useCallback(async (forceEmaRefresh = false) => {
    const next = await fetchDashboardAws({ forceEmaRefresh });
    return next;
  }, []);

  const hydrateBurnDay = useCallback(async () => {
    try {
      const submittedAt = await getOnboardingSubmittedAt();
      setBurnDayLabel(formatProgramDayLabel(submittedAt));
    } catch {
      setBurnDayLabel(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const next = await hydrate();
        if (!cancelled) setDashboard(next);
        if (!cancelled) await hydrateBurnDay();
      })();
      return () => {
        cancelled = true;
      };
    }, [hydrate, hydrateBurnDay]),
  );

  useEffect(() => {
    let mounted = true;
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prev === "inactive" || prev === "background") &&
        nextState === "active"
      ) {
        void (async () => {
          const next = await hydrate();
          if (mounted) setDashboard(next);
          if (mounted) await hydrateBurnDay();
        })();
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [hydrate, hydrateBurnDay]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await hydrate(true);
      setDashboard(next);
      await hydrateBurnDay();
    } finally {
      setRefreshing(false);
    }
  }, [hydrate, hydrateBurnDay]);

  const welcomeFacility = resolveWelcomeFacility(me);
  const welcomeRole = resolveWelcomeRole(me, "patient");
  const patientActivityIsos = useMemo(() => {
    if (!dashboard) return [];
    return [
      dashboard.libreSubmittedAtIso,
      dashboard.psqiSnapshot?.createdAtIso,
      dashboard.fatigueSnapshot?.createdAtIso,
      dashboard.gad7Snapshot?.createdAtIso,
      dashboard.cognitiveSnapshot?.createdAtIso,
      dashboard.painIntensitySnapshot?.createdAtIso,
      ...dashboard.fatigueHistory.map((row) => row.createdAtIso),
      ...dashboard.gad7History.map((row) => row.createdAtIso),
      ...dashboard.cognitiveHistory.map((row) => row.createdAtIso),
      ...dashboard.painIntensityHistory.map((row) => row.createdAtIso),
      ...dashboard.libreSubmissionHistory.map((row) => row.createdAtIso),
    ].filter((iso): iso is string => typeof iso === "string" && iso.trim() !== "");
  }, [dashboard]);
  const lastVisitDaysAgo = useMemo(
    () => resolveLastVisitDaysAgo(me, patientActivityIsos),
    [me, patientActivityIsos],
  );

  const pendingTodayRows = useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.emaRows, ...dashboard.careProgramRows].filter(
      (row) => row.pending,
    );
  }, [dashboard]);

  return (
    <Screen
      animateEntry
      preset="tabs"
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={colors.primary}
        />
      }
      scroll
    >
      <StatusBar style="dark" />

      <MassGeneralHospitalLogo />

      <View style={styles.homeStack}>
      <DashboardWelcomeHeader
        burnDayLabel={burnDayLabel}
        facility={welcomeFacility}
        lastVisitDaysAgo={lastVisitDaysAgo}
        name={displayName}
        role={welcomeRole}
        onAccountPress={() => setAccountOpen(true)}
      />

      {!dashboard ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <DashboardOverviewSection rows={pendingTodayRows} />

            <LibreSectionalRadar
              domains={dashboard.libreDomains}
              libreSubmissionHistory={dashboard.libreSubmissionHistory}
              overallTScore={dashboard.libreOverall}
              submittedAtIso={dashboard.libreSubmittedAtIso}
            />

            <PsqiSleepQualityCard snapshot={dashboard.psqiSnapshot} />

            <FatigueScoreCard
              history={dashboard.fatigueHistory}
              snapshot={dashboard.fatigueSnapshot}
            />

            <Gad7DashboardCard
              history={dashboard.gad7History}
              snapshot={dashboard.gad7Snapshot}
            />

            <CognitiveFunctionDashboardCard
              history={dashboard.cognitiveHistory}
              snapshot={dashboard.cognitiveSnapshot}
            />

            <PainIntensityScoreCard
              history={dashboard.painIntensityHistory}
              snapshot={dashboard.painIntensitySnapshot}
            />

            <AppleHealthSection />

            <View style={styles.voiceAnalysisWrap}>
              <VoiceAnalysisDashboardCard />
            </View>

          <DashboardBottomSections
            careProgramRows={dashboard.careProgramRows}
          />
        </>
      )}
      </View>
      <AccountSidePanel
        displayName={displayName ?? "Patient"}
        facility={welcomeFacility}
        role={welcomeRole}
        roleLabel="Patient account"
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onSettings={() => {
          setAccountOpen(false);
          router.push("/settings" as Href);
        }}
        onSignOut={() => {
          setAccountOpen(false);
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeStack: {
    width: "100%",
    alignSelf: "stretch",
  },
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  voiceAnalysisWrap: {
    width: "100%",
    alignSelf: "stretch",
    marginBottom: spacing.xxl,
  },
});

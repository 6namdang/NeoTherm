import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LibreSectionalRadar } from "../../src/components/charts/LibreSectionalRadar";
import { PsqiSleepQualityCard } from "../../src/components/charts/PsqiSleepQualityCard";
import { FatigueScoreCard } from "../../src/components/charts/FatigueScoreCard";
import { PainIntensityScoreCard } from "../../src/components/charts/PainIntensityScoreCard";
import { Gad7DashboardCard } from "../../src/components/charts/Gad7DashboardCard";
import { CognitiveFunctionDashboardCard } from "../../src/components/charts/CognitiveFunctionDashboardCard";
import {
  DashboardBottomSections,
  type CareProgramHomeRow,
} from "../../src/components/DashboardBottomSections";
import { EmaHomeSection } from "../../src/components/EmaHomeSection";
import { AssistiveClinicalNotice } from "../../src/components/AssistiveClinicalNotice";
import { DashboardWelcomeHeader } from "../../src/components/DashboardWelcomeHeader";
import { MetricCard } from "../../src/components/MetricCard";
import { Screen } from "../../src/components/Screen";
import {
  ALL_FORMS,
  ASSIGNABLE_CARE_FORM_IDS,
  getFormById,
} from "../../src/constants/forms";
import { ALL_EMA_FORMS } from "../../src/constants/ema-forms";
import { getMyFormResponses } from "../../src/lib/api";
import { resolveEmaAssignmentPending } from "../../src/lib/ema-assignment-eligibility";
import { resolveAssignmentSnapshot } from "../../src/lib/form-assignment-eligibility";
import {
  coerceAnswersRecord,
  computeLibreRadarScores,
  type LibreDashboardSubmissionSnapshot,
  type LibreRadarDomainSlice,
} from "../../src/lib/libre-scoring";
import {
  computePsqiScores,
  type PsqiDashboardSubmissionSnapshot,
} from "../../src/lib/psqi-scoring";
import {
  scoreFatigue,
  type FatigueDashboardSnapshot,
} from "../../src/lib/fatigue-scoring";
import {
  scoreGad7,
  type Gad7DashboardSnapshot,
} from "../../src/lib/gad7-scoring";
import {
  scoreCognitiveFunction,
  type CognitiveDashboardSnapshot,
} from "../../src/lib/cognitive-function-scoring";
import {
  painIntensityOrdinalSnapshot,
  scorePainIntensity,
  type PainIntensityDashboardPoint,
  type PainIntensityDashboardSnapshot,
} from "../../src/lib/pain-intensity-scoring";
import { usePostAuth } from "../../src/lib/post-auth-context";
import { colors } from "../../src/theme/colors";
import { spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

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
  openQuestionnaires: number;
  recentAssignmentTitle: string | null;
  emaRows: CareProgramHomeRow[];
  libreDomains: LibreRadarDomainSlice[];
  libreOverall: number | null;
  libreSubmittedAtIso: string | null;
  libreSubmissionHistory: LibreDashboardSubmissionSnapshot[];
  psqiSnapshot: PsqiDashboardSubmissionSnapshot | null;
  fatigueSnapshot: FatigueDashboardSnapshot | null;
  gad7Snapshot: Gad7DashboardSnapshot | null;
  cognitiveSnapshot: CognitiveDashboardSnapshot | null;
  painIntensitySnapshot: PainIntensityDashboardSnapshot | null;
  painIntensityHistory: PainIntensityDashboardPoint[];
  careProgramRows: CareProgramHomeRow[];
};

async function fetchDashboardAws(): Promise<DashboardData> {
  const careProgramRows: CareProgramHomeRow[] = await Promise.all(
    ALL_FORMS.map(async (f) => {
      try {
        const snap = await resolveAssignmentSnapshot(f.id);
        return {
          id: f.id,
          title: (f.name ?? "").trim(),
          pending: snap.pending,
        };
      } catch {
        return {
          id: f.id,
          title: (f.name ?? "").trim(),
          pending: true,
        };
      }
    }),
  );

  const emaRows: CareProgramHomeRow[] = await Promise.all(
    ALL_EMA_FORMS.map(async (f) => {
      try {
        const pending = await resolveEmaAssignmentPending(f.id, Date.now());
        return {
          id: f.id,
          title: (f.name ?? "").trim(),
          pending,
        };
      } catch {
        return {
          id: f.id,
          title: (f.name ?? "").trim(),
          pending: false,
        };
      }
    }),
  );

  const scaleOpen = careProgramRows.reduce<number>(
    (n, row) => n + (row.pending ? 1 : 0),
    0,
  );
  const emaOpen = emaRows.reduce<number>(
    (n, row) => n + (row.pending ? 1 : 0),
    0,
  );
  const openQuestionnaires = scaleOpen + emaOpen;

  let recentAssignmentTitle: string | null = null;
  try {
    const rows = await getMyFormResponses(undefined, 80);
    const careOnly = rows.filter((r) => ASSIGNABLE_CARE_FORM_IDS.has(r.form_id));
    careOnly.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const latest = careOnly[0];
    if (latest) {
      recentAssignmentTitle =
        getFormById(latest.form_id)?.name?.trim() || latest.form_id;
    }
  } catch {
    recentAssignmentTitle = null;
  }

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
      };
      break;
    }
  } catch {
    psqiSnapshot = null;
  }

  let fatigueSnapshot: FatigueDashboardSnapshot | null = null;
  try {
    const fatigueRows = await getMyFormResponses("fatigue_v1", FATIGUE_FETCH_LIMIT);
    fatigueRows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
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
      fatigueSnapshot = {
        createdAtIso: createdRaw,
        ...scored,
      };
      break;
    }
  } catch {
    fatigueSnapshot = null;
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
  try {
    const rows = await getMyFormResponses("gad7_v1", GAD_COGNITIVE_FETCH_LIMIT);
    rows.sort(
      (a, b) =>
        Date.parse(String(b.created_at ?? 0)) -
        Date.parse(String(a.created_at ?? 0)),
    );
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
      gad7Snapshot = {
        createdAtIso: createdRaw,
        ...scored,
      };
      break;
    }
  } catch {
    gad7Snapshot = null;
  }

  let cognitiveSnapshot: CognitiveDashboardSnapshot | null = null;
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
      cognitiveSnapshot = {
        createdAtIso: createdRaw,
        ...scored,
      };
      break;
    }
  } catch {
    cognitiveSnapshot = null;
  }

  return {
    openQuestionnaires,
    recentAssignmentTitle,
    emaRows,
    libreDomains,
    libreOverall,
    libreSubmittedAtIso,
    libreSubmissionHistory,
    psqiSnapshot,
    fatigueSnapshot,
    gad7Snapshot,
    cognitiveSnapshot,
    painIntensitySnapshot,
    painIntensityHistory,
    careProgramRows,
  };
}

export default function HomeScreen() {
  const { me } = usePostAuth();
  const displayName =
    typeof me?.name === "string" && me.name.trim() !== ""
      ? me.name.trim()
      : null;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const hydrate = useCallback(async () => {
    const next = await fetchDashboardAws();
    setDashboard(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (!cancelled) await hydrate();
      })();
      return () => {
        cancelled = true;
      };
    }, [hydrate]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prev === "inactive" || prev === "background") &&
        nextState === "active"
      ) {
        void hydrate();
      }
    });
    return () => {
      sub.remove();
    };
  }, [hydrate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await hydrate();
    } finally {
      setRefreshing(false);
    }
  }, [hydrate]);

  const recentLabel =
    dashboard !== null &&
    dashboard.recentAssignmentTitle &&
    dashboard.recentAssignmentTitle !== ""
      ? dashboard.recentAssignmentTitle
      : "n/a";

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

      <DashboardWelcomeHeader name={displayName} />

      <View style={styles.introBlock}>
        <Text style={[styles.kicker, typography.eyebrow]}>Overview</Text>
        <Text style={[styles.lede, typography.body]}>
          Recovery check-ins assigned by your hospital and your latest Care
          program submissions, loaded from BurnX servers.
        </Text>
      </View>

      <View style={styles.clinicalNoticeWrap}>
        <AssistiveClinicalNotice />
      </View>

      {!dashboard ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <View style={styles.metrics}>
            <MetricCard
              footer="Count of questionnaires currently due under your care assignments"
              label="Open questionnaires"
              value={String(dashboard.openQuestionnaires)}
            />
            <MetricCard
              footer="Latest completed questionnaire from Care programs"
              label="Recent assignment"
              value={recentLabel}
            />
          </View>

          <EmaHomeSection
            rows={dashboard.emaRows.filter((r) => r.pending)}
          />

            <LibreSectionalRadar
              domains={dashboard.libreDomains}
              libreSubmissionHistory={dashboard.libreSubmissionHistory}
              overallTScore={dashboard.libreOverall}
              submittedAtIso={dashboard.libreSubmittedAtIso}
            />

            <PsqiSleepQualityCard snapshot={dashboard.psqiSnapshot} />

            <FatigueScoreCard snapshot={dashboard.fatigueSnapshot} />

            <Gad7DashboardCard snapshot={dashboard.gad7Snapshot} />

            <CognitiveFunctionDashboardCard snapshot={dashboard.cognitiveSnapshot} />

            <PainIntensityScoreCard
              history={dashboard.painIntensityHistory}
              snapshot={dashboard.painIntensitySnapshot}
            />

          <DashboardBottomSections
            careProgramRows={dashboard.careProgramRows}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  introBlock: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    maxWidth: 560,
  },
  kicker: {
    color: colors.primary,
    marginBottom: spacing.sm + 2,
  },
  lede: {
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 0,
  },
  clinicalNoticeWrap: {
    marginBottom: spacing.xl + spacing.sm,
  },
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.xxl + spacing.sm,
  },
});

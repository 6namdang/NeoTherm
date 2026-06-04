import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  DoctorKpiStrip,
  DoctorRosterToolbar,
} from "../../src/components/doctor/DoctorDashboardToolbar";
import { DoctorInstrumentDetailModal } from "../../src/components/doctor/DoctorInstrumentDetailModal";
import { DoctorInstrumentTrendModule } from "../../src/components/doctor/DoctorInstrumentTrendModule";
import { AssistiveClinicalNotice } from "../../src/components/AssistiveClinicalNotice";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { DashboardWelcomeHeader } from "../../src/components/DashboardWelcomeHeader";
import { AccountSidePanel } from "../../src/components/AccountSidePanel";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { useToast } from "../../src/components/ToastProvider";
import type { DoctorPatientRow, FormResponse } from "../../src/lib/api";
import { getPatientFormResponses } from "../../src/lib/api";
import { buildPatientScoreTimeline } from "../../src/lib/doctor-patient-scoreboard";
import type { ScoreTimelineRow } from "../../src/lib/doctor-patient-scoreboard";
import {
  activityBucket,
  computeRosterSummary,
  filterPatients,
  formatRosterSyncedLabel,
  sortPatients,
  type ActivityBucket,
  type PatientFilterMode,
  type PatientSortMode,
} from "../../src/lib/doctor-roster-insights";
import {
  dedupeFormResponses,
  submissionMatchesForm,
} from "../../src/lib/doctor-form-response-keys";
import { exportPatientQuestionnairePdf } from "../../src/lib/doctor-patient-pdf-export";
import { formatRelativePast } from "../../src/lib/format-relative-past";
import { bxLog } from "../../src/lib/debug-log";
import { usePostAuth } from "../../src/lib/post-auth-context";
import {
  resolveLastVisitDaysAgo,
  resolveWelcomeFacility,
  resolveWelcomeRole,
} from "../../src/lib/welcome-meta";
import { useSession } from "../../src/lib/auth-context";
import { useDoctorPatients } from "../../src/state/doctor-patients-context";
import { colors } from "../../src/theme/colors";
import { fontFamily } from "../../src/theme/fontFamily";
import { radius, spacing } from "../../src/theme/spacing";
import { typography } from "../../src/theme/typography";

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; timeline: ScoreTimelineRow[]; responses: FormResponse[] }
  | { kind: "error"; message: string };

type InstrumentModalState = {
  formId: string;
  title: string;
  submissions: FormResponse[];
} | null;

function isoToLocalMidnightMs(iso: string): number {
  const t = iso.includes("T") ? Date.parse(iso) : Date.parse(`${iso}T12:00:00`);
  return Number.isFinite(t) ? t : NaN;
}

function daysSinceInjuryLabel(injuryDate: string | null): string | null {
  if (!injuryDate || injuryDate.trim() === "") return null;
  const t0 = isoToLocalMidnightMs(injuryDate.trim());
  if (!Number.isFinite(t0)) return null;
  const delta = Date.now() - t0;
  const days = Math.floor(delta / (24 * 3600 * 1000));
  if (days < 0) return "Injury date in future — check intake";
  if (days === 0) return "Day of injury (day 0)";
  if (days === 1) return "1 day since injury";
  return `${days} days since injury`;
}

function relativePast(iso: string | null): string {
  if (!iso || iso.trim() === "") return "No recent activity";
  const s = formatRelativePast(iso);
  return s === "" ? "No recent activity" : s;
}

function initialFromName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  const match = t.match(/[a-z]/i);
  return match ? match[0].toUpperCase() : t.charAt(0).toUpperCase();
}

function pillForActivity(bucket: ActivityBucket): {
  label: string;
  bg: string;
  fg: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  switch (bucket) {
    case "fresh":
      return {
        label: "< 48h",
        bg: colors.successSoft,
        fg: colors.success,
        icon: "checkmark-circle",
      };
    case "week":
      return {
        label: "This week",
        bg: colors.primarySoft,
        fg: colors.primary,
        icon: "pulse-outline",
      };
    case "aging":
      return {
        label: "8–14d",
        bg: colors.warningSoft,
        fg: colors.warning,
        icon: "time-outline",
      };
    case "stale":
      return {
        label: "14d+",
        bg: colors.dangerSoft,
        fg: colors.danger,
        icon: "alert-circle-outline",
      };
    default:
      return {
        label: "No activity",
        bg: colors.surfaceMuted,
        fg: colors.textMuted,
        icon: "help-circle-outline",
      };
  }
}

export default function DoctorDashboardScreen() {
  const { showToast } = useToast();
  const { me } = usePostAuth();
  const { signOut } = useSession();
  const {
    patients,
    loading,
    refreshing,
    error: listError,
    lastFetchedAt,
    refresh,
  } = useDoctorPatients();

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<PatientSortMode>("activity");
  const [filterMode, setFilterMode] = useState<PatientFilterMode>("all");

  const displayName =
    typeof me?.name === "string" && me.name.trim() !== ""
      ? me.name.trim()
      : null;

  const welcomeFacility = resolveWelcomeFacility(me);
  const welcomeRole = resolveWelcomeRole(me, "clinician");
  const lastVisitDaysAgo = useMemo(
    () =>
      resolveLastVisitDaysAgo(
        me,
        lastFetchedAt !== null ? [new Date(lastFetchedAt).toISOString()] : [],
      ),
    [lastFetchedAt, me],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailByPatient, setDetailByPatient] = useState<Record<string, DetailState>>({});
  const [instrumentModal, setInstrumentModal] = useState<InstrumentModalState>(null);
  const [pdfExportPatientId, setPdfExportPatientId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const patientDetailTicketRef = useRef(0);
  const rosterSeedRef = useRef(false);

  const rosterSummary = useMemo(
    () => computeRosterSummary(patients),
    [patients],
  );

  const visiblePatients = useMemo(() => {
    const filtered = filterPatients(patients, search, filterMode);
    return sortPatients(filtered, sortMode);
  }, [patients, search, filterMode, sortMode]);

  const syncLabel = formatRosterSyncedLabel(lastFetchedAt);

  useEffect(() => {
    if (lastFetchedAt === null) return;
    if (!rosterSeedRef.current) {
      rosterSeedRef.current = true;
      return;
    }
    setDetailByPatient({});
    setExpandedId(null);
  }, [lastFetchedAt]);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilterMode("all");
    setSortMode("activity");
  }, []);

  useEffect(() => {
    const pid = expandedId;
    if (!pid) return;

    const ticket = ++patientDetailTicketRef.current;

    setDetailByPatient((d) => {
      const cur = d[pid];
      if (cur?.kind === "ready") return d;
      bxLog("doctor", "lazy fetch submissions", { patient_id: pid });
      return { ...d, [pid]: { kind: "loading" } };
    });

    void (async () => {
      try {
        const items = await getPatientFormResponses({
          patientId: pid,
          limit: 400,
          timeoutMs: 55_000,
        });
        if (ticket !== patientDetailTicketRef.current) return;
        const timeline = buildPatientScoreTimeline(items);
        setDetailByPatient((d) => ({
          ...d,
          [pid]: { kind: "ready", timeline, responses: items },
        }));
      } catch (e) {
        if (ticket !== patientDetailTicketRef.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        setDetailByPatient((d) => ({
          ...d,
          [pid]: { kind: "error", message: msg },
        }));
      }
    })();
  }, [expandedId]);

  function toggleExpanded(patientId: string): void {
    setExpandedId((cur) => (cur === patientId ? null : patientId));
  }

  function onRowPressPatient(p: DoctorPatientRow): void {
    bxLog("doctor", "patient row", { patient_id: p.patient_id });
    toggleExpanded(p.patient_id);
  }

  const renderPatient = ({ item: p }: { item: DoctorPatientRow }) => {
    const expanded = expandedId === p.patient_id;
    const ds = detailByPatient[p.patient_id];
    const injuryLine = daysSinceInjuryLabel(p.injury_date);
    const lastRel = relativePast(p.last_form_at);
    const bucket = activityBucket(p);
    const pill = pillForActivity(bucket);

    return (
      <Card variant="elevated" style={styles.rosterCard}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => onRowPressPatient(p)}
          style={styles.rosterHead}
          activeOpacity={0.82}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initialFromName(p.name)}</Text>
          </View>
          <View style={styles.rosterHeadText}>
            <View style={styles.nameRow}>
              <Text style={[styles.patientName, typography.title]} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={[styles.activityPill, { backgroundColor: pill.bg }]}>
                <Ionicons color={pill.fg} name={pill.icon} size={12} />
                <Text style={[styles.activityPillText, { color: pill.fg }]}>
                  {pill.label}
                </Text>
              </View>
            </View>
            {injuryLine !== null ? (
              <Text style={[styles.metaLine, typography.caption]}>{injuryLine}</Text>
            ) : (
              <Text style={[styles.metaLine, typography.caption]}>Injury date not on file</Text>
            )}
            <Text style={[styles.metaLine, typography.caption]}>Last: {lastRel}</Text>
            {p.last_form_summary != null && p.last_form_summary.trim() !== "" ? (
              <Text style={[styles.summaryLine, typography.body]} numberOfLines={2}>
                {p.last_form_summary.trim()}
              </Text>
            ) : null}
          </View>
          <Ionicons
            color={colors.textMuted}
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
          />
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.expandBody}>
            <Text style={[styles.expandSectionTitle, typography.micro]}>Questionnaire trend</Text>
            {ds?.kind === "loading" || ds === undefined ? (
              <View style={styles.expandBusy}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[typography.caption, styles.expandBusyText]}>
                  Loading scores…
                </Text>
              </View>
            ) : null}
            {ds?.kind === "error" ? (
              <Text style={[styles.errorText, typography.caption]}>{ds.message}</Text>
            ) : null}
            {ds?.kind === "ready"
              ? (() => {
                  const exportCount = dedupeFormResponses(ds.responses).length;
                  const exportingPdf = pdfExportPatientId === p.patient_id;
                  if (exportCount === 0) return null;
                  return (
                    <View style={styles.exportPdfBlock}>
                      <Button
                        disabled={exportingPdf}
                        title={
                          exportingPdf
                            ? "Preparing PDF…"
                            : `Export all questionnaire answers (PDF) · ${exportCount}`
                        }
                        variant="secondary"
                        onPress={() => {
                          void (async () => {
                            setPdfExportPatientId(p.patient_id);
                            try {
                              const result = await exportPatientQuestionnairePdf({
                                patientName: p.name,
                                patientId: p.patient_id,
                                responses: ds.responses,
                              });
                              if (result.kind === "web_print_tab") {
                                showToast(
                                  "A printable tab opened — choose Print → Save as PDF (or your browser’s equivalent).",
                                  "info",
                                );
                              } else {
                                showToast(
                                  result.shared
                                    ? "PDF ready — use the share sheet to save or send."
                                    : "PDF generated — sharing isn’t available on this device; try Files / Downloads or repeat export after updating permissions.",
                                  "success",
                                );
                              }
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : String(e), "error");
                            } finally {
                              setPdfExportPatientId(null);
                            }
                          })();
                        }}
                        style={styles.exportPdfBtn}
                      />
                      <Text style={[typography.caption, styles.exportPdfHint]}>
                        Every loaded submission across programmes and dates (subject to sync limits). PHI —
                        handle per policy.
                      </Text>
                    </View>
                  );
                })()
              : null}
            {ds?.kind === "ready" && ds.timeline.length === 0 ? (
              <Text style={[typography.caption, styles.muted]}>
                No scored programme submissions in the loaded window.
              </Text>
            ) : null}
            {ds?.kind === "ready" && ds.timeline.length > 0
              ? (() => {
                  const ready = ds;
                  return (
                    <View style={styles.trendStack}>
                      <Text style={[styles.trendIntro, typography.caption]}>
                        One card per programme. Column dates match that programme only — visits and
                        cadences differ (daily EMA vs weekly LIBRE, etc.). Tap{" "}
                        <Text style={styles.trendIntroStrong}>Responses</Text> for every item answer and
                        the headline score per visit.
                      </Text>
                      {ready.timeline.map((row) => (
                        <DoctorInstrumentTrendModule
                          key={row.formId}
                          row={row}
                          onOpenDetail={() => {
                            const subs = dedupeFormResponses(
                              ready.responses.filter((r) =>
                                submissionMatchesForm(r, row.formId),
                              ),
                            );
                            setInstrumentModal({
                              formId: row.formId,
                              title: row.title,
                              submissions: subs,
                            });
                          }}
                        />
                      ))}
                    </View>
                  );
                })()
              : null}
          </View>
        ) : null}
      </Card>
    );
  };

  const listEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerBusy}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingCaption, typography.caption]}>Loading hospital roster…</Text>
        </View>
      );
    }
    if (listError !== null) return null;
    if (patients.length > 0 && visiblePatients.length === 0) {
      return (
        <View style={styles.filterEmpty}>
          <Text style={[typography.bodyStrong, styles.filterEmptyTitle]}>No matching patients</Text>
          <Text style={[typography.body, styles.filterEmptySub]}>
            Try another search term, or widen the filters to see the full roster.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={resetFilters}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && styles.resetBtnPressed,
            ]}
          >
            <Text style={[typography.bodyStrong, styles.resetBtnText]}>Clear search & filters</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <EmptyState
        icon="people-outline"
        title="No patients on file"
        subtitle="When patients enroll under your hospital in NeoTherm, they appear here with injury context and programme activity."
      />
    );
  };

  return (
    <Screen preset="tabs" scroll={false}>
      <StatusBar style="dark" />
      <FlatList
        data={visiblePatients}
        keyExtractor={(r) => r.patient_id}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <DashboardWelcomeHeader
              facility={welcomeFacility}
              lastVisitDaysAgo={lastVisitDaysAgo}
              name={displayName}
              role={welcomeRole}
              unreadCount={0}
              onAccountPress={() => setAccountOpen(true)}
            />
            <Text style={[styles.pageTitle, typography.eyebrow]}>Clinical overview</Text>
            <Text style={[styles.pageSubtitle, typography.body]}>
              One place to monitor your hospital cohort: engagement, injury context, and questionnaire
              trajectories — without replacing the medical record.
            </Text>
            <DoctorKpiStrip summary={rosterSummary} />
            <AssistiveClinicalNotice
              confidenceLabel="Oversight support"
              helperText="NeoTherm summarises submitted questionnaires only. Always confirm against source documentation and unit policy before clinical decisions."
            />
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, typography.title]}>Roster & programmes</Text>
              <Text style={[styles.sectionMeta, typography.caption]}>
                {loading ? "…" : `${visiblePatients.length} shown${patients.length !== visiblePatients.length ? ` of ${patients.length}` : ""}`}
              </Text>
            </View>
            <DoctorRosterToolbar
              filterMode={filterMode}
              lastSyncedLabel={syncLabel}
              onFilterChange={setFilterMode}
              onSearchChange={setSearch}
              onSortChange={setSortMode}
              search={search}
              sortMode={sortMode}
              summary={rosterSummary}
            />
            {listError !== null ? (
              <View style={styles.bannerError}>
                <Ionicons color={colors.danger} name="warning-outline" size={18} />
                <Text style={[styles.bannerErrorText, typography.caption]}>{listError}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={listEmpty()}
        renderItem={renderPatient}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      />
      <DoctorInstrumentDetailModal
        formId={instrumentModal?.formId ?? ""}
        instrumentTitle={instrumentModal?.title ?? ""}
        onClose={() => setInstrumentModal(null)}
        submissions={instrumentModal?.submissions ?? []}
        visible={instrumentModal !== null}
      />
      <AccountSidePanel
        displayName={displayName ?? "Clinician"}
        facility={welcomeFacility}
        role={welcomeRole}
        roleLabel="Clinician account"
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

const AVATAR = 44;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  pageTitle: {
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
    maxWidth: 560,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    flex: 1,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  bannerErrorText: {
    color: colors.danger,
    flex: 1,
    lineHeight: 20,
  },
  rosterCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: "hidden",
  },
  rosterHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.primary,
  },
  rosterHeadText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  patientName: {
    color: colors.text,
    flexShrink: 1,
  },
  activityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    flexShrink: 0,
  },
  activityPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  metaLine: {
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryLine: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  expandBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundAlt,
  },
  expandSectionTitle: {
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  expandBusy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  expandBusyText: {
    color: colors.textMuted,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  trendStack: {
    marginTop: spacing.xs,
  },
  trendIntro: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  trendIntroStrong: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  centerBusy: {
    paddingVertical: spacing.xxl * 2,
    alignItems: "center",
    gap: spacing.md,
  },
  loadingCaption: {
    color: colors.textMuted,
  },
  filterEmpty: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  filterEmptyTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  filterEmptySub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  resetBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  resetBtnPressed: {
    opacity: 0.88,
  },
  resetBtnText: {
    color: colors.primaryForeground,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
  exportPdfBlock: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  exportPdfBtn: {
    alignSelf: "flex-start",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  exportPdfHint: {
    color: colors.textMuted,
    lineHeight: 18,
    maxWidth: 520,
  },
});

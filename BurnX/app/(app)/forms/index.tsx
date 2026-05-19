import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { PageHeader } from "../../../src/components/PageHeader";
import { Screen } from "../../../src/components/Screen";
import type { FormDefinition } from "../../../src/constants/forms";
import { forms } from "../../../src/constants/forms";
import { resolveAssignmentSnapshot } from "../../../src/lib/form-assignment-eligibility";
import { resolveVoiceWeeklyAssignmentPending } from "../../../src/lib/voice-checkin-eligibility";
import { colors } from "../../../src/theme/colors";
import { radius, spacing } from "../../../src/theme/spacing";
import { typography } from "../../../src/theme/typography";

/** Care-program assignment buckets: fixed order within each section. */
const ASSIGNMENT_SECTIONS: readonly {
  readonly title: string;
  readonly formIds: readonly string[];
}[] = [
  {
    title: "VOICE CHECK-IN",
    formIds: ["voice_checkin_v1"],
  },
  {
    title: "DAILY CHECK-INS",
    formIds: [
      "ema_sleep_quality_v1",
      "ema_pain_now_v1",
      "ema_mood_v1",
    ],
  },
  {
    title: "PAIN",
    formIds: ["pain_intensity_v1", "pain_inference_v1"],
  },
  {
    title: "SLEEP & ENERGY",
    formIds: ["psqi_v1", "fatigue_v1"],
  },
  {
    title: "MENTAL HEALTH",
    formIds: ["gad7_v1", "cognitive_function_v1"],
  },
  {
    title: "RECOVERY & QUALITY OF LIFE",
    formIds: ["libre_v1"],
  },
] as const;

function groupAssignmentsBySection(
  pending: FormDefinition[],
): { title: string; forms: FormDefinition[] }[] {
  const byId = new Map(pending.map((f) => [f.id, f] as const));
  const catalogIds = new Set(
    ASSIGNMENT_SECTIONS.flatMap((s) => [...s.formIds]),
  );

  const sections: { title: string; forms: FormDefinition[] }[] = [];
  for (const sec of ASSIGNMENT_SECTIONS) {
    const inSection: FormDefinition[] = [];
    for (const id of sec.formIds) {
      const row = byId.get(id);
      if (row) inSection.push(row);
    }
    if (inSection.length > 0) {
      sections.push({ title: sec.title, forms: inSection });
    }
  }

  const orphans = pending.filter((f) => !catalogIds.has(f.id));
  if (orphans.length > 0) {
    sections.push({ title: "OTHER ASSIGNMENTS", forms: orphans });
  }

  return sections;
}

const ICON_FOR_FORM: Record<string, keyof typeof Ionicons.glyphMap> = {
  voice_checkin_v1: "mic-outline",
  pain_intensity_v1: "pulse-outline",
  pain_inference_v1: "bandage-outline",
  libre_v1: "clipboard-outline",
  psqi_v1: "moon-outline",
  cognitive_function_v1: "bulb-outline",
  fatigue_v1: "battery-half-outline",
  gad7_v1: "alert-circle-outline",
  ema_sleep_quality_v1: "bed-outline",
  ema_pain_now_v1: "medkit-outline",
  ema_mood_v1: "happy-outline",
};

export default function FormsListScreen() {
  /** `null` = still loading completion status per catalog form. */
  const [pendingForms, setPendingForms] = useState<FormDefinition[] | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Source of truth **`GET /form-responses`**. Weekly Voice (**`voice_checkin_v1`**) uses
   * **`resolveVoiceWeeklyAssignmentPending`**: newest **`created_at`** vs current slot window (**`weekly-local-slot-window`**),
   * plus read-through **`assignment_last_completed`** mirror after GET like other programmes. Scale questionnaires use **`resolveAssignmentSnapshot`**.
   */
  const loadAssignmentsFromAws = useCallback(async (): Promise<
    FormDefinition[]
  > => {
    const next: FormDefinition[] = [];
    for (const f of forms) {
      if (f.assignmentWeeklyLocalSlots) {
        try {
          if (await resolveVoiceWeeklyAssignmentPending(f.assignmentWeeklyLocalSlots, Date.now())) {
            next.push(f);
          }
        } catch {
          next.push(f);
        }
        continue;
      }
      try {
        const snap = await resolveAssignmentSnapshot(f.id);
        if (snap.pending) next.push(f);
      } catch {
        next.push(f);
      }
    }
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const next = await loadAssignmentsFromAws();
        if (!cancelled) setPendingForms(next);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadAssignmentsFromAws]),
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
        loadAssignmentsFromAws().then((next) => {
          if (mounted) setPendingForms(next);
        });
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [loadAssignmentsFromAws]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPendingForms(await loadAssignmentsFromAws());
    } finally {
      setRefreshing(false);
    }
  }, [loadAssignmentsFromAws]);

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

      <PageHeader
        eyebrow="Care programs"
        subtitle="Assigned questionnaires and check-ins from your care team appear here when available."
        title="Assignments"
      />

      {pendingForms === null ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : pendingForms.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="No outstanding assignments"
          subtitle="Completed questionnaires are on record. New assignments will appear when your care team releases them."
        />
      ) : (
        <View style={styles.list}>
          {groupAssignmentsBySection(pendingForms).map((section) => (
            <View
              accessibilityRole="none"
              key={section.title}
              style={styles.sectionBlock}
            >
              <Text
                accessibilityRole="header"
                style={[typography.eyebrow, styles.sectionTitle]}
              >
                {section.title}
              </Text>
              <View style={styles.sectionAccentRule} />
              <View style={styles.sectionInner}>
                {section.forms.map((form) => (
                  <FormRow form={form} key={form.id} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function assignmentHref(form: FormDefinition): Href {
  if (form.id === "voice_checkin_v1") return "/voice-checkin" as Href;
  return `/forms/${form.id}` as Href;
}

function FormRow({ form }: { form: FormDefinition }) {
  const icon = ICON_FOR_FORM[form.id] ?? "document-text-outline";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(assignmentHref(form))}
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      <Card variant="outline" style={styles.rowCard}>
        <View style={styles.rowMain}>
          <View style={styles.rowIcon}>
            <Ionicons color={colors.primary} name={icon} size={22} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTitleRow}>
              <Text style={[styles.formTitle, typography.title]}>{form.title}</Text>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, typography.micro]}>ASSIGNED</Text>
              </View>
            </View>
            <Text style={[styles.formDescription, typography.body]}>
              {form.description}
            </Text>
          </View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionBlock: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sectionAccentRule: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
    maxWidth: 40,
  },
  sectionInner: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  rowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  rowCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  formTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.accentMuted,
    letterSpacing: 0.55,
    fontFamily: typography.micro.fontFamily,
    fontSize: 11,
  },
  formDescription: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontFamily: typography.body.fontFamily,
  },
});

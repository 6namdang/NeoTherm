import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "../Card";
import { EmptyState } from "../EmptyState";
import type { FormDefinition } from "../../constants/forms";
import {
  getAssignmentsListCache,
  setAssignmentsListCache,
} from "../../lib/assignments-list-cache";
import { loadPendingAssignments } from "../../lib/load-pending-assignments";
import { LONG_ASSESSMENT_BUNDLE_ID } from "../../lib/care-program-form-groups";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const ICON_FOR_FORM: Record<string, keyof typeof Ionicons.glyphMap> = {
  pain_intensity_v1: "pulse-outline",
  pain_inference_v1: "bandage-outline",
  libre_v1: "clipboard-outline",
  psqi_v1: "moon-outline",
  cognitive_function_v1: "bulb-outline",
  fatigue_v1: "battery-half-outline",
  gad7_v1: "alert-circle-outline",
  long_assessment_v1: "layers-outline",
  moca_v1: "analytics-outline",
  ema_sleep_quality_v1: "bed-outline",
  ema_pain_now_v1: "medkit-outline",
  ema_mood_v1: "happy-outline",
};

type AssignmentsListProps = {
  formIds: readonly string[];
  emptySubtitle?: string;
  onRefreshRegister?: (refresh: () => Promise<void>) => void;
  onRefreshingChange?: (refreshing: boolean) => void;
};

export function AssignmentsList({
  formIds,
  emptySubtitle = "Completed questionnaires are on record. New assignments will appear when your care team releases them.",
  onRefreshRegister,
  onRefreshingChange,
}: AssignmentsListProps) {
  const [pendingForms, setPendingForms] = useState<FormDefinition[] | null>(
    () => getAssignmentsListCache(formIds) ?? null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const loadFiltered = useCallback(async () => {
    return loadPendingAssignments(formIds);
  }, [formIds]);

  const refresh = useCallback(async () => {
    onRefreshingChange?.(true);
    try {
      const next = await loadFiltered();
      setAssignmentsListCache(formIds, next);
      setPendingForms(next);
    } finally {
      onRefreshingChange?.(false);
    }
  }, [formIds, loadFiltered, onRefreshingChange]);

  useEffect(() => {
    onRefreshRegister?.(refresh);
  }, [onRefreshRegister, refresh]);

  useEffect(() => {
    if (getAssignmentsListCache(formIds)) return;

    let cancelled = false;
    (async () => {
      const next = await loadFiltered();
      if (cancelled) return;
      setAssignmentsListCache(formIds, next);
      setPendingForms(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [formIds, loadFiltered]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const next = await loadFiltered();
        if (cancelled) return;
        setAssignmentsListCache(formIds, next);
        setPendingForms(next);
      })();
      return () => {
        cancelled = true;
      };
    }, [formIds, loadFiltered]),
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
        loadFiltered().then((next) => {
          if (mounted) {
            setAssignmentsListCache(formIds, next);
            setPendingForms(next);
          }
        });
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [formIds, loadFiltered]);

  if (pendingForms === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (pendingForms.length === 0) {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        subtitle={emptySubtitle}
        title="No outstanding assignments"
      />
    );
  }

  return (
    <View style={styles.list}>
      {pendingForms.map((form) => (
        <FormRow form={form} key={form.id} />
      ))}
    </View>
  );
}

function FormRow({ form }: { form: FormDefinition }) {
  const icon = ICON_FOR_FORM[form.id] ?? "document-text-outline";
  const href =
    form.id === LONG_ASSESSMENT_BUNDLE_ID
      ? ("/forms/long-assessment" as Href)
      : (`/forms/${form.id}` as Href);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
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
    gap: spacing.md,
    paddingBottom: spacing.xxl,
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

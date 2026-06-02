import * as Notifications from "expo-notifications";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { firstNameFromMeName } from "../constants/ema-copy";
import { useSession } from "../lib/auth-context";
import { getMe } from "../lib/api";
import { bxLog } from "../lib/debug-log";
import { localCalendarYmd } from "../lib/ema-schedule-fallback";
import {
  emaOutstandingMatchesAssignmentsUi,
  ensureNotificationPresentationConfigured,
  refreshSchedules,
  syncSchedule,
} from "../lib/notifications-engine";
import { useToast } from "./ToastProvider";

/** Deep links NeoTherm-triggered notifications that include `href` + `kind`. */
function readRoutableNotificationHref(
  data: Record<string, unknown> | undefined | null,
): Href | null {
  if (!data || typeof data !== "object") return null;
  const kind = data.kind;
  if (
    kind !== "ema_open" &&
    kind !== "ema_strike" &&
    kind !== "ema_audit" &&
    kind !== "test_preview"
  ) {
    return null;
  }
  const href = data.href;
  if (typeof href !== "string" || !href.startsWith("/")) return null;
  return href as Href;
}

/**
 * Patient shell: local notification permission, schedule sync, foreground refresh, tap routing,
 * and pending-EMA toast (patient role only).
 *
 * **Pending / “due now” UX** uses **`emaOutstandingMatchesAssignmentsUi()`** → **`resolveAssignmentSnapshot`** →
 * **`getLastCompletion`** (**`GET /form-responses`**), same semantics as Assignments + home dashboard EMA rows.
 *
 * **`refreshSchedules()`** still calls **`GET /me/assignments`** once per pass for telemetry / parity; **`assignmentsSnapshot`**
 * state only waits until that attempt finishes (**`undefined` → defined**). Dynamo shape does **not** gate the toast text.
 */
export function PatientEmaNotificationBootstrap(): null {
  const router = useRouter();
  const { role } = useSession();
  const { showToast } = useToast();
  const lastForegroundRefreshAtRef = useRef(0);
  const lastSyncScheduleAtRef = useRef(0);
  const lastSyncScheduleYmdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  /** After first **`refreshSchedules`** completes: **`undefined`** = loading; **`null`** = Dynamo GET failed (toast predicate still runs). */
  const [assignmentsSnapshot, setAssignmentsSnapshot] = useState<
    Record<string, string | null> | null | undefined
  >(undefined);

  useEffect(() => {
    ensureNotificationPresentationConfigured();

    let cancelled = false;

    void (async () => {
      if (Platform.OS !== "web") {
        try {
          await syncSchedule();
          lastSyncScheduleAtRef.current = Date.now();
          lastSyncScheduleYmdRef.current = localCalendarYmd();
        } catch (caught) {
          bxLog("notifications", "initial syncSchedule failed", caught);
        }
      }
      if (cancelled) return;

      const snapshot = await refreshSchedules();
      if (cancelled) return;

      setAssignmentsSnapshot(snapshot);

      if (Platform.OS !== "web") {
        try {
          const resp = await Notifications.getLastNotificationResponseAsync();
          const href = readRoutableNotificationHref(
            resp?.notification.request.content.data as Record<string, unknown>,
          );
          if (href) {
            router.push(href);
          }
        } catch (caught) {
          bxLog("notifications", "cold-start notification route failed", caught);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (role !== "patient") return;
    /** Wait until mount **`refreshSchedules`** finished (snapshot may be **`null`** on GET failure). */
    if (assignmentsSnapshot === undefined) return;

    let cancelled = false;

    void (async () => {
      try {
        const pending = await emaOutstandingMatchesAssignmentsUi();
        if (cancelled || !pending) return;

        let first: string | null = null;
        try {
          const me = await getMe();
          first = firstNameFromMeName(me?.name);
        } catch {
          first = null;
        }

        const who = first ?? "there";
        showToast(`Hey ${who}, you have pending check ins waiting.`, "info", {
          onPress: () => router.push("/forms/daily" as Href),
        });
      } catch (caught) {
        bxLog("notifications", "pending EMA toast skipped", caught);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, assignmentsSnapshot, router, showToast]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subTap = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const href = readRoutableNotificationHref(
          response.notification.request.content.data as Record<string, unknown>,
        );
        if (href) router.push(href);
      },
    );

    return () => {
      subTap.remove();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        next !== "active" ||
        !(prev === "inactive" || prev === "background")
      ) {
        return;
      }

      const now = Date.now();
      const today = localCalendarYmd(new Date(now));
      const dayChanged = lastSyncScheduleYmdRef.current !== today;
      const syncStale = now - lastSyncScheduleAtRef.current >= 24 * 60 * 60 * 1000;

      if (dayChanged || syncStale) {
        lastSyncScheduleAtRef.current = now;
        lastSyncScheduleYmdRef.current = today;
        void (async () => {
          try {
            await syncSchedule();
          } catch (caught) {
            bxLog("notifications", "foreground syncSchedule failed", caught);
          }
          try {
            await refreshSchedules();
          } catch (caught) {
            bxLog("notifications", "foreground refreshSchedules failed", caught);
          }
        })();
        lastForegroundRefreshAtRef.current = now;
        return;
      }

      if (now - lastForegroundRefreshAtRef.current >= 60_000) {
        lastForegroundRefreshAtRef.current = now;
        void refreshSchedules();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  return null;
}

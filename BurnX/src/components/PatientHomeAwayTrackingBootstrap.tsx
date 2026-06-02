import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  DeviceEventEmitter,
  type AppStateStatus,
  Platform,
} from "react-native";

import { useSession } from "../lib/auth-context";
import { bxLog } from "../lib/debug-log";
import {
  hasHomeLocationConsent,
  recordHomeLocationConsent,
} from "../lib/home-location-consent";
import { getHomeAwaySnapshot } from "../lib/home-location-storage";
import {
  enableHomeAwayTrackingFromAddress,
  ensureHomeAwayTrackingRegistered,
  reconcileHomeAwayPermissionsOnForeground,
  refreshHomeAwayStateFromCurrentLocation,
} from "../lib/home-location-tracking";
import { HomeAwayAddressSetupModal } from "./location/HomeAwayAddressSetupModal";
import { HomeAwayConsentModal } from "./location/HomeAwayConsentModal";
import { useToast } from "./ToastProvider";

export function PatientHomeAwayTrackingBootstrap() {
  const { role } = useSession();
  const { showToast } = useToast();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRefreshAtRef = useRef(0);
  const promptedRef = useRef(false);
  const permissionWarnedRef = useRef(false);
  const lastBackgroundOkRef = useRef<boolean | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const [addressSetupVisible, setAddressSetupVisible] = useState(false);
  const consentedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || role !== "patient") return;

    let cancelled = false;
    void (async () => {
      try {
        const [consented, snapshot] = await Promise.all([
          hasHomeLocationConsent(),
          getHomeAwaySnapshot(),
        ]);
        consentedRef.current = consented;
        if (!cancelled && !promptedRef.current) {
          promptedRef.current = true;
          if (!consented) {
            setConsentVisible(true);
          } else if (!snapshot.config) {
            setAddressSetupVisible(true);
          }
        }
      } catch (caught) {
        bxLog("home-location", "location consent check failed", caught);
      }
    })();

    void ensureHomeAwayTrackingRegistered().catch((caught) => {
      bxLog("home-location", "ensure geofence registration failed", caught);
    });

    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (Platform.OS === "web" || role !== "patient") return;
    const sub = DeviceEventEmitter.addListener(
      "burnx-home-away-open-setup",
      () => setAddressSetupVisible(true),
    );
    return () => {
      sub.remove();
    };
  }, [role]);

  useEffect(() => {
    if (Platform.OS === "web" || role !== "patient") return;

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        next !== "active" ||
        !(prev === "inactive" || prev === "background")
      ) {
        return;
      }

      void reconcileHomeAwayPermissionsOnForeground()
        .then((result) => {
          DeviceEventEmitter.emit("burnx-home-away-refresh");
          if (
            lastBackgroundOkRef.current === true &&
            !result.backgroundOk &&
            !permissionWarnedRef.current
          ) {
            permissionWarnedRef.current = true;
            showToast(
              "Always location is required for background home/away estimates.",
              "info",
            );
          }
          lastBackgroundOkRef.current = result.backgroundOk;
        })
        .catch((caught) => {
          bxLog("home-location", "foreground permission reconcile failed", caught);
        });

      const now = Date.now();
      if (now - lastRefreshAtRef.current < 60_000) return;
      lastRefreshAtRef.current = now;

      void refreshHomeAwayStateFromCurrentLocation().catch((caught) => {
        bxLog("home-location", "foreground estimate refresh failed", caught);
      });
    });

    return () => {
      sub.remove();
    };
  }, [role, showToast]);

  if (Platform.OS === "web" || role !== "patient") return null;

  return (
    <>
      <HomeAwayConsentModal
        visible={consentVisible}
        onClose={() => setConsentVisible(false)}
        onAccepted={() => {
          void (async () => {
            try {
              if (!consentedRef.current) {
                await recordHomeLocationConsent({
                  understandsNoRouteHistory: true,
                  understandsHomeBoundary: true,
                  understandsLocalDelete: true,
                  agreesToTracking: true,
                });
                consentedRef.current = true;
              }
              setConsentVisible(false);
              setAddressSetupVisible(true);
            } catch (caught) {
              Alert.alert(
                "Home/Away tracking",
                caught instanceof Error
                  ? caught.message
                  : "NeoTherm could not save consent.",
              );
            }
          })();
        }}
      />
      <HomeAwayAddressSetupModal
        visible={addressSetupVisible}
        onClose={() => setAddressSetupVisible(false)}
        onSelected={async (home) => {
          try {
            await enableHomeAwayTrackingFromAddress(home);
            await refreshHomeAwayStateFromCurrentLocation();
            setAddressSetupVisible(false);
            showToast("Home/Away tracking is set up on this device.", "success");
            DeviceEventEmitter.emit("burnx-home-away-refresh");
          } catch (caught) {
            Alert.alert(
              "Home/Away tracking",
              caught instanceof Error
                ? caught.message
                : "NeoTherm could not enable home/away tracking.",
            );
          }
        }}
      />
    </>
  );
}

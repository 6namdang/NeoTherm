import { useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, Platform } from "react-native";

import { useSession } from "../lib/auth-context";
import { bxLog } from "../lib/debug-log";
import { getHomeAwaySnapshot } from "../lib/home-location-storage";
import {
  getSleepMotionPermissionGranted,
  registerSleepTrackerHandlers,
  requestSleepMotionPermission,
} from "../lib/sleep-tracker";
import { SleepMotionSetupModal } from "./health/SleepMotionSetupModal";

export function PatientSleepTrackingBootstrap() {
  const { role } = useSession();
  const [motionSetupVisible, setMotionSetupVisible] = useState(false);
  const promptedRef = useRef(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios" || role !== "patient") return;

    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await getHomeAwaySnapshot();
        if (cancelled || !snapshot.config || promptedRef.current) return;

        const motionGranted = await getSleepMotionPermissionGranted();
        if (motionGranted) {
          unregisterRef.current?.();
          unregisterRef.current = registerSleepTrackerHandlers();
          return;
        }

        promptedRef.current = true;
        setMotionSetupVisible(true);
      } catch (caught) {
        bxLog("sleep-tracker", "bootstrap check failed", caught);
      }
    })();

    const homeRefreshSub = DeviceEventEmitter.addListener(
      "burnx-home-away-refresh",
      () => {
        void (async () => {
          try {
            const [snapshot, motionGranted] = await Promise.all([
              getHomeAwaySnapshot(),
              getSleepMotionPermissionGranted(),
            ]);
            if (!snapshot.config || motionGranted || promptedRef.current) return;
            promptedRef.current = true;
            setMotionSetupVisible(true);
          } catch (caught) {
            bxLog("sleep-tracker", "home refresh bootstrap failed", caught);
          }
        })();
      },
    );

    return () => {
      cancelled = true;
      homeRefreshSub.remove();
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, [role]);

  if (Platform.OS !== "ios" || role !== "patient") return null;

  return (
    <SleepMotionSetupModal
      visible={motionSetupVisible}
      onClose={() => setMotionSetupVisible(false)}
      onAccepted={async () => {
        const granted = await requestSleepMotionPermission();
        if (!granted) {
          bxLog("sleep-tracker", "motion permission not granted");
          return;
        }
        unregisterRef.current?.();
        unregisterRef.current = registerSleepTrackerHandlers();
        setMotionSetupVisible(false);
        DeviceEventEmitter.emit("burnx-sleep-refresh");
      }}
    />
  );
}

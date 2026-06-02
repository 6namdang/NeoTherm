import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { deleteMe } from "./api";
import { clearAssignmentsListCache } from "./assignments-list-cache";
import * as auth from "./auth";
import { bxLog } from "./debug-log";
import { clearEmaScheduleCache } from "./ema-schedule-loader";
import { stopHomeAwayTracking } from "./home-location-tracking";
import { clearLongAssessmentSession } from "./long-assessment-session";

/**
 * Permanently deletes the signed-in patient's NeoTherm account: server profile/responses,
 * Cognito user, scheduled notifications, and local caches on this device.
 */
export async function deletePatientAccount(): Promise<void> {
  bxLog("account", "deletePatientAccount start");
  await auth.getValidIdToken();

  await deleteMe();

  try {
    await stopHomeAwayTracking();
  } catch (caught) {
    bxLog("account", "stopHomeAwayTracking failed (non-fatal)", caught);
  }

  await clearLongAssessmentSession();
  clearEmaScheduleCache();
  clearAssignmentsListCache();

  if (Platform.OS !== "web") {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (caught) {
      bxLog("account", "cancel notifications failed (non-fatal)", caught);
    }
  }

  await auth.deleteCognitoUser();
  await auth.signOut();
  bxLog("account", "deletePatientAccount done");
}

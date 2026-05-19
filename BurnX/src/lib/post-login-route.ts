import { router, type Href } from "expo-router";
import { getMe, type MeResponse } from "./api";
import { bxLog } from "./debug-log";
import { getRoleFromStoredIdToken } from "./jwt";

/** After tokens are stored, pick onboarding vs patient app vs clinician app (PostAuth mirrors this). */
export async function replaceRouteAfterAuthentication(): Promise<void> {
  bxLog("route", "replaceRouteAfterAuthentication start");
  try {
    const role = await getRoleFromStoredIdToken();
    if (!role) {
      bxLog("route", "replace → profile-creation (no JWT role)");
      router.replace("/profile-creation" as Href);
      return;
    }

    let me: MeResponse | null;
    try {
      me = await getMe();
    } catch (fetchErr) {
      bxLog("route", "getMe failed → profile onboarding", {
        message: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      });
      router.replace("/profile-creation" as Href);
      return;
    }

    const needs =
      me === null || me.onboarding_completed !== true;

    if (needs) {
      bxLog("route", "replace → profile-creation", {
        onboarding_completed: me?.onboarding_completed,
      });
      router.replace("/profile-creation" as Href);
      return;
    }

    if (role === "doctor") {
      bxLog("route", "replace → /(app-doctor)");
      router.replace("/(app-doctor)" as Href);
      return;
    }

    bxLog("route", "replace → /(app) (patient)");
    router.replace("/(app)" as Href);
  } catch (err) {
    bxLog("route", "replaceRoute unexpected error → profile onboarding", {
      message: err instanceof Error ? err.message : String(err),
    });
    router.replace("/profile-creation" as Href);
  }
}

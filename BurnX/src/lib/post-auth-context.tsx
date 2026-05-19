import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { getMe, type MeResponse } from "./api";
import { useSession } from "./auth-context";
import { bxLog } from "./debug-log";

type PostAuthValue = {
  /** True once getMe + role resolved (or skipped when logged out). */
  ready: boolean;
  /** User still needs onboarding (no row or not completed); also when JWT has no recognizable role while session exists. */
  needsOnboarding: boolean;
  /** Refetch after actions that change server onboarding state (e.g. finish onboarding). */
  refetch: () => Promise<void>;
  me: MeResponse | null | undefined;
};

const PostAuthContext = createContext<PostAuthValue | null>(null);

function isStaleSessionError(error: unknown): boolean {
  const msg =
    (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("(401)") ||
    msg.includes("unauthorized") ||
    msg.includes("session expired") ||
    msg.includes("sign in again") ||
    msg.includes("please sign in") ||
    msg.includes("authentication required") ||
    msg.includes("notauthorizedexception") ||
    msg.includes("not authorized") ||
    msg.includes("user does not exist") ||
    msg.includes("no refresh token") ||
    msg.includes("cannot refresh tokens")
  );
}

export function PostAuthProvider({ children }: PropsWithChildren) {
  const { session, role, signOut } = useSession();
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

  const runBootstrap = useCallback(async () => {
    bxLog("postAuth", "runBootstrap", { session, role });
    if (!session) {
      setNeedsOnboarding(false);
      setMe(undefined);
      setReady(true);
      bxLog("postAuth", "runBootstrap: no session, ready");
      return;
    }

    if (!role) {
      setNeedsOnboarding(true);
      setMe(undefined);
      setReady(true);
      bxLog("postAuth", "runBootstrap: missing JWT role → needs onboarding funnel");
      return;
    }

    setReady(false);
    try {
      const row = await getMe();
      setMe(row);
      const incomplete =
        row === null || row.onboarding_completed !== true;
      setNeedsOnboarding(incomplete);
      bxLog("postAuth", "runBootstrap", {
        role,
        hasRow: row !== null,
        onboarding_completed: row?.onboarding_completed,
        needsOnboarding: incomplete,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      bxLog("postAuth", "runBootstrap error", { message });

      /** Cognito/AWS user deleted = tokens invalid; clear local shell so `/` loads again. */
      if (isStaleSessionError(error)) {
        bxLog("postAuth", "runBootstrap → signOut (server rejected session)");
        await signOut();
        setMe(undefined);
        setNeedsOnboarding(false);
      } else {
        setMe(null);
        setNeedsOnboarding(true);
      }
    } finally {
      setReady(true);
      bxLog("postAuth", "runBootstrap ready");
    }
  }, [session, role, signOut]);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  const refetch = useCallback(async () => {
    bxLog("postAuth", "refetch");
    await runBootstrap();
  }, [runBootstrap]);

  const value = useMemo(
    () => ({
      ready,
      needsOnboarding,
      refetch,
      me,
    }),
    [me, needsOnboarding, ready, refetch],
  );

  return (
    <PostAuthContext.Provider value={value}>{children}</PostAuthContext.Provider>
  );
}

export function usePostAuth() {
  const ctx = use(PostAuthContext);
  if (!ctx) {
    throw new Error("usePostAuth must be used within PostAuthProvider");
  }
  return ctx;
}

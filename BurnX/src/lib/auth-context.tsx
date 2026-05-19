import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import * as auth from "./auth";
import { bxLog } from "./debug-log";
import {
  decodeJwtPayload,
  type AuthRoleClaim,
  parseRoleFromPayload,
} from "./jwt";
import { getStorageItem } from "./storage";

type SessionContextValue = {
  isLoading: boolean;
  session: boolean;
  /** `custom:role` from id token; null when logged out or missing/invalid claim. */
  role: AuthRoleClaim | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(false);
  const [role, setRole] = useState<AuthRoleClaim | null>(null);

  const refresh = useCallback(async () => {
    bxLog("session", "refresh start");
    setIsLoading(true);
    const next = await auth.isLoggedIn();
    setSession(next);
    let decodedRole: AuthRoleClaim | null = null;
    if (next) {
      const idToken = await getStorageItem("idToken");
      decodedRole = parseRoleFromPayload(decodeJwtPayload(idToken ?? ""));
      setRole(decodedRole);
      bxLog("session", "refresh decoded role", { role: decodedRole });
    } else {
      setRole(null);
    }
    setIsLoading(false);
    bxLog("session", "refresh done", { session: next, role: decodedRole });
  }, []);

  const signOut = useCallback(async () => {
    bxLog("session", "SessionProvider.signOut");
    await auth.signOut();
    setSession(false);
    setRole(null);
    bxLog("session", "signOut done");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ isLoading, refresh, session, role, signOut }),
    [isLoading, refresh, session, role, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return value;
}

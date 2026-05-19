import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { DoctorPatientRow } from "../lib/api";
import { getHospitalPatients } from "../lib/api";
import { bxLog } from "../lib/debug-log";

const STALE_MS = 60_000;

export type DoctorPatientsContextValue = {
  patients: DoctorPatientRow[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  refresh: () => Promise<void>;
};

const DoctorPatientsContext = createContext<DoctorPatientsContextValue | null>(
  null,
);

export function DoctorPatientsProvider({ children }: PropsWithChildren) {
  const [patients, setPatients] = useState<DoctorPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const patientsRef = useRef<DoctorPatientRow[]>([]);
  patientsRef.current = patients;

  const lastFetchedAtRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchRoster = useCallback(async () => {
    setError(null);
    const hasList = patientsRef.current.length > 0;
    if (hasList) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getHospitalPatients();
      setPatients(res.patients);
      const now = Date.now();
      setLastFetchedAt(now);
      lastFetchedAtRef.current = now;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      bxLog("doctor", "roster fetch failed", { msg });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        (prev === "inactive" || prev === "background") &&
        next === "active" &&
        Date.now() - lastFetchedAtRef.current > STALE_MS
      ) {
        void fetchRoster();
      }
    });
    return () => sub.remove();
  }, [fetchRoster]);

  const value = useMemo(
    (): DoctorPatientsContextValue => ({
      patients,
      loading,
      refreshing,
      error,
      lastFetchedAt,
      refresh: fetchRoster,
    }),
    [patients, loading, refreshing, error, lastFetchedAt, fetchRoster],
  );

  return (
    <DoctorPatientsContext.Provider value={value}>
      {children}
    </DoctorPatientsContext.Provider>
  );
}

export function useDoctorPatients(): DoctorPatientsContextValue {
  const ctx = use(DoctorPatientsContext);
  if (!ctx) {
    throw new Error(
      "useDoctorPatients must be used within DoctorPatientsProvider",
    );
  }
  return ctx;
}

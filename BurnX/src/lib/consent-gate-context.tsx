import {
  createContext,
  use,
  useMemo,
  type PropsWithChildren,
} from "react";

/** After successful POST consent, root navigator sets `consentResolved` to entered shell. */
type ConsentGateContextValue = {
  markConsentRecorded: () => void;
};

const ConsentGateContext = createContext<ConsentGateContextValue | null>(
  null,
);

export function ConsentGateProvider({
  children,
  markConsentRecorded,
}: PropsWithChildren<ConsentGateContextValue>) {
  const value = useMemo(
    () => ({ markConsentRecorded }),
    [markConsentRecorded],
  );
  return (
    <ConsentGateContext.Provider value={value}>
      {children}
    </ConsentGateContext.Provider>
  );
}

export function useConsentGate() {
  const ctx = use(ConsentGateContext);
  if (!ctx) {
    throw new Error("useConsentGate must be used within ConsentGateProvider");
  }
  return ctx;
}

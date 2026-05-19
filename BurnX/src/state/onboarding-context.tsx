import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { BURN_INTAKE_FORM } from "../constants/forms/onboarding";

const OnboardingContext = createContext<OnboardingAnswersValue | null>(null);

export type OnboardingAnswersValue = {
  answers: Record<string, unknown>;
  setAnswer: (id: string, value: unknown) => void;
  setAnswers: (partial: Record<string, unknown>) => void;
  reset: () => void;
};

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [answers, setAnswersState] = useState<Record<string, unknown>>({});

  const setAnswer = useCallback((id: string, value: unknown) => {
    setAnswersState((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setAnswers = useCallback((partial: Record<string, unknown>) => {
    setAnswersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setAnswersState({});
  }, []);

  const value = useMemo(
    () => ({
      answers,
      setAnswer,
      setAnswers,
      reset,
    }),
    [answers, reset, setAnswer, setAnswers],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboardingAnswers() {
  const ctx = use(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboardingAnswers must be used within OnboardingProvider");
  }
  return ctx;
}

/** Answers for `burn_intake_v1` only (profile fields excluded). */
export function collectBurnIntakeAnswers(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const ids = new Set<string>();
  for (const section of BURN_INTAKE_FORM.sections) {
    for (const q of section.questions) {
      ids.add(q.id);
    }
  }
  const out: Record<string, unknown> = {};
  for (const id of ids) {
    if (id in answers && answers[id] !== undefined) {
      out[id] = answers[id];
    }
  }
  return out;
}

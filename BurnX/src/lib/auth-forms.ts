import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { confirmSignUp, signIn, signUp } from "./auth";
import { bxLog } from "./debug-log";
import { useSession } from "./auth-context";
import { replaceRouteAfterAuthentication } from "./post-login-route";
import { stashPendingSignupPassword, takePendingSignupPassword } from "./pending-signup-password";

export type AuthRole = "patient" | "doctor";

export function useLoginForm() {
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      setError(null);
      const trimmed = email.trim();
      if (!trimmed || !password) {
        setError("Enter your email and password.");
        return;
      }
      bxLog("form", "login submit");
      await signIn({ email: trimmed, password });
      await refresh();
      await replaceRouteAfterAuthentication();
      bxLog("form", "login success");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Login failed";
      bxLog("form", "login error", { message });
      setError(message);
    }
  }

  return {
    email,
    error,
    password,
    setEmail,
    setPassword,
    submit,
  };
}

function normalizeSignupRoleParam(raw: unknown): AuthRole {
  if (raw === undefined || raw === null) return "patient";
  const n = String(raw).trim().toLowerCase();
  if (
    n === "doctor" ||
    n === "clinician" ||
    n === "physician" ||
    n === "provider"
  )
    return "doctor";
  return "patient";
}

export function useSignupForm() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<AuthRole>(() =>
    normalizeSignupRoleParam(params.role),
  );

  useEffect(() => {
    setRole(normalizeSignupRoleParam(params.role));
  }, [params.role]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      setError(null);
      bxLog("form", "signup submit", { email, role });
      await signUp({
        email,
        password,
        role,
      });
      await stashPendingSignupPassword(password);
      router.push({ pathname: "/confirm", params: { email } });
      bxLog("form", "signup ok → /confirm");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Signup failed";
      bxLog("form", "signup error", { message });
      setError(message);
    }
  }

  return {
    email,
    error,
    password,
    role,
    setEmail,
    setPassword,
    setRole,
    submit,
  };
}

export function useConfirmSignupForm(email: string) {
  const { refresh } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      setError(null);
      bxLog("form", "confirm signup submit", { email });
      await confirmSignUp({ code, email });
      const password = await takePendingSignupPassword();
      if (!password) {
        bxLog("form", "confirm: no pending password → /login");
        setError(
          "We lost the temporary link after signup. Return to login and enter your password normally.",
        );
        router.replace("/login" as Href);
        return;
      }
      await signIn({ email, password });
      await refresh();
      await replaceRouteAfterAuthentication();
      bxLog("form", "confirm signup success");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Confirmation failed";
      bxLog("form", "confirm signup error", { message });
      setError(message);
    }
  }

  return {
    code,
    error,
    setCode,
    submit,
  };
}

import type { AuthRole } from "../lib/auth-forms";

type EmailFieldHints = {
  label: string;
  placeholder: string;
};

export function signupEmailHints(role: AuthRole): EmailFieldHints {
  if (role === "patient") {
    return {
      label: "Email",
      placeholder: "you@gmail.com",
    };
  }

  return {
    label: "Work email",
    placeholder: "name@yourhospital.org",
  };
}

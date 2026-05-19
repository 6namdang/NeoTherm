import { COGNITO } from "../../aws-config";
import { bxLog } from "./debug-log";
import { clearAssignmentCachesForSub } from "./form-assignment-cache-storage";
import { getSubjectFromStoredIdToken } from "./jwt";
import { deleteStorageItem, getStorageItem, setStorageItem } from "./storage";

const COGNITO_URL = `https://cognito-idp.${COGNITO.region}.amazonaws.com/`;

type AuthResult = {
  AccessToken: string;
  IdToken: string;
  RefreshToken?: string;
  ExpiresIn: number;
};

type CognitoJson = {
  message?: string;
  __type?: string;
  AuthenticationResult?: AuthResult;
  /** Present on success when further steps are required (no tokens yet). */
  ChallengeName?: string;
};

function mapCognitoError(data: CognitoJson): string | null {
  const t = typeof data.__type === "string" ? data.__type : "";
  if (t.includes("UserNotFoundException")) {
    return "No account exists for this email address. Request access to create one, or check for a typo.";
  }
  if (t.includes("NotAuthorizedException")) {
    return "Incorrect email or password.";
  }
  if (t.includes("UserNotConfirmedException")) {
    return "Verify your email before signing in. Check your inbox for the confirmation code.";
  }
  if (t.includes("PasswordResetRequiredException")) {
    return "Password reset required. Use your reset link or contact your administrator.";
  }
  if (t.includes("TooManyRequestsException")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (t.includes("UsernameExistsException")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (t.includes("InvalidPasswordException")) {
    return typeof data.message === "string" ? data.message : "Password does not meet requirements.";
  }
  return null;
}

async function cognitoFetch(target: string, body: Record<string, unknown>) {
  const response = await fetch(COGNITO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as CognitoJson;

  if (!response.ok) {
    bxLog("cognito", "cognitoFetch error", {
      target,
      status: response.status,
      message: data.message,
      __type: data.__type,
    });
    const mapped = mapCognitoError(data);
    const raw = data.message || data.__type || "Cognito request failed";
    let message =
      mapped ??
      (typeof raw === "string" ? raw : "Cognito request failed");
    if (message.includes("USER_PASSWORD_AUTH")) {
      message =
        "This app is not allowed to sign in with email and password yet. In Amazon Cognito, open your user pool → App integration → your app client → Edit → Authentication flows, and enable “Allow username-password (non-SRP) flow” (ALLOW_USER_PASSWORD_AUTH). Save, wait a minute, then try again.";
    }
    throw new Error(message);
  }

  return data;
}

export async function signUp({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role: "patient" | "doctor";
}) {
  bxLog("auth", "signUp", { email, role });
  return cognitoFetch("SignUp", {
    ClientId: COGNITO.clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "custom:role", Value: role },
    ],
  });
}

export async function confirmSignUp({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  bxLog("auth", "confirmSignUp", { email, codeLen: code.length });
  return cognitoFetch("ConfirmSignUp", {
    ClientId: COGNITO.clientId,
    Username: email,
    ConfirmationCode: code,
  });
}

export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  bxLog("auth", "signIn", { email });
  const data = await cognitoFetch("InitiateAuth", {
    ClientId: COGNITO.clientId,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  if (data.ChallengeName) {
    bxLog("cognito", "InitiateAuth challenge", {
      challenge: data.ChallengeName,
    });
    if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      throw new Error(
        "A new password is required for this account. Reset your password or contact your administrator.",
      );
    }
    throw new Error(
      "Additional verification is required for this sign-in. Try again or contact your administrator.",
    );
  }

  const result = data.AuthenticationResult;

  if (!result?.RefreshToken) {
    throw new Error("Sign-in did not complete. Try again or contact your administrator.");
  }

  await setStorageItem("accessToken", result.AccessToken);
  await setStorageItem("idToken", result.IdToken);
  await setStorageItem("refreshToken", result.RefreshToken);
  await setStorageItem(
    "tokenExpiresAt",
    String(Date.now() + result.ExpiresIn * 1000),
  );

  bxLog("auth", "signIn ok", { expiresIn: result.ExpiresIn });
  return result;
}

export async function refreshSession() {
  bxLog("auth", "refreshSession start");
  const refreshToken = await getStorageItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const data = await cognitoFetch("InitiateAuth", {
    ClientId: COGNITO.clientId,
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  const result = data.AuthenticationResult;

  if (!result) {
    throw new Error("Missing authentication tokens");
  }

  await setStorageItem("accessToken", result.AccessToken);
  await setStorageItem("idToken", result.IdToken);
  await setStorageItem(
    "tokenExpiresAt",
    String(Date.now() + result.ExpiresIn * 1000),
  );

  bxLog("auth", "refreshSession ok", { expiresIn: result.ExpiresIn });
  return result;
}

export async function getValidIdToken() {
  const expiresAt = await getStorageItem("tokenExpiresAt");
  if (!expiresAt) {
    return null;
  }

  if (Date.now() > Number.parseInt(expiresAt, 10) - 60_000) {
    bxLog("auth", "getValidIdToken: near expiry, refreshing");
    try {
      await refreshSession();
    } catch {
      bxLog("auth", "getValidIdToken: refresh failed → signOut");
      await signOut();
      return null;
    }
  }

  return getStorageItem("idToken");
}

export async function signOut() {
  bxLog("auth", "signOut");
  const sub = await getSubjectFromStoredIdToken();
  if (sub) {
    await clearAssignmentCachesForSub(sub);
  }
  await deleteStorageItem("accessToken");
  await deleteStorageItem("idToken");
  await deleteStorageItem("refreshToken");
  await deleteStorageItem("tokenExpiresAt");
}

export async function isLoggedIn() {
  return Boolean(await getStorageItem("refreshToken"));
}

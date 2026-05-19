import { deleteStorageItem, getStorageItem, setStorageItem } from "./storage";

const KEY = "burnx_pending_signup_password";

/** Store password briefly before navigating to confirm (native SecureStore / web localStorage). */
export async function stashPendingSignupPassword(password: string): Promise<void> {
  await setStorageItem(KEY, password);
}

/** Read and remove. Returns null if missing (e.g. already consumed or app killed). */
export async function takePendingSignupPassword(): Promise<string | null> {
  const value = await getStorageItem(KEY);
  await deleteStorageItem(KEY);
  return value;
}

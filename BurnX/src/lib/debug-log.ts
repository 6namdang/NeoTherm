/**
 * Central debug logging — off by default for performance (dev and prod).
 * Set `EXPO_PUBLIC_BURNX_DEBUG=1` in `.env` when you need tagged logs (never log tokens/passwords).
 */
function loggingEnabled(): boolean {
  try {
    return process.env.EXPO_PUBLIC_BURNX_DEBUG === "1";
  } catch {
    return false;
  }
}

/** Prefixed console log for navigation, API, auth, and flows. */
export function bxLog(tag: string, ...args: unknown[]): void {
  if (!loggingEnabled()) return;
  console.log(`[BurnX:${tag}]`, ...args);
}

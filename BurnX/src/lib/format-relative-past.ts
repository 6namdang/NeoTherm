/**
 * "Time ago" label for list rows. Hermes / some Android builds omit `Intl.RelativeTimeFormat`;
 * we fall back to plain English so UI never crashes.
 */
export function formatRelativePast(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  let sec = Math.round((Date.now() - t) / 1000);
  if (sec < 0) sec = 0;

  let rtf: Intl.RelativeTimeFormat | null = null;
  try {
    if (typeof Intl.RelativeTimeFormat === "function") {
      rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    }
  } catch {
    try {
      if (typeof Intl.RelativeTimeFormat === "function") {
        rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      }
    } catch {
      rtf = null;
    }
  }

  if (rtf !== null) {
    try {
      if (sec < 60) return rtf.format(-sec, "second");
      const min = Math.floor(sec / 60);
      if (min < 60) return rtf.format(-min, "minute");
      const hr = Math.floor(min / 60);
      if (hr < 48) return rtf.format(-hr, "hour");
      const days = Math.floor(hr / 24);
      if (days < 14) return rtf.format(-days, "day");
    } catch {
      /* fall through to manual strings */
    }
  }

  if (sec < 60) return sec <= 5 ? "Just now" : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? "1 min ago" : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  const days = Math.floor(hr / 24);
  if (days < 14) return days === 1 ? "1 day ago" : `${days} days ago`;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(t));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Signed offset from `iso` to now (past / future). Used where the original code used
 * `RelativeTimeFormat` with minute/hour/day units from `(date - Date.now())`.
 */
export function formatRelativeToNowIso(iso: string): string {
  const t = Date.parse(iso.trim());
  if (!Number.isFinite(t)) return "";
  const min = Math.round((t - Date.now()) / 60_000);

  let rtf: Intl.RelativeTimeFormat | null = null;
  try {
    if (typeof Intl.RelativeTimeFormat === "function") {
      rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    }
  } catch {
    try {
      if (typeof Intl.RelativeTimeFormat === "function") {
        rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      }
    } catch {
      rtf = null;
    }
  }

  if (rtf !== null) {
    try {
      if (Math.abs(min) < 60) return rtf.format(min, "minute");
      const hr = Math.round(min / 60);
      if (Math.abs(hr) < 48) return rtf.format(hr, "hour");
      const days = Math.round(hr / 24);
      return rtf.format(days, "day");
    } catch {
      /* manual */
    }
  }

  const absM = Math.abs(min);
  if (absM < 60) return min === 0 ? "now" : `${absM} min`;
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 48) return `${hr} h`;
  const days = Math.round(hr / 24);
  return `${days} d`;
}

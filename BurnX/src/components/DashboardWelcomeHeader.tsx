import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { titleCaseRole } from "../lib/welcome-meta";
import { fontFamily } from "../theme/fontFamily";
import { spacing } from "../theme/spacing";

const IOS_BLACK = "#000000";
const IOS_SYSTEM_BLUE = "#007AFF";
const IOS_BADGE_RED = "#FF3B30";
const IOS_SUBLINE = "#8E8E93";

const AVATAR = 42;
const BADGE = 10;

function greetingForHour(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

function parseFirstWordTitleCase(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "";
  const first = (t.split(/\s+/)[0] ?? "").replace(/^[^a-zA-Z0-9]+/, "");
  if (!first) return t.charAt(0).toUpperCase() + t.slice(1);
  const lower = first.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function initialFromName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  const match = t.match(/[a-z]/i);
  return match ? match[0].toUpperCase() : t.charAt(0).toUpperCase();
}

function formatLastVisit(days: number): string {
  if (days <= 0) return "Last visit today";
  if (days === 1) return "Last visit 1 day ago";
  return `Last visit ${days} days ago`;
}

export function buildWelcomeSubline(params: {
  facility?: string | null;
  role?: string | null;
  lastVisitDaysAgo?: number | null;
  burnDayLabel?: string | null;
}): string | null {
  const parts: string[] = [];
  const burnDay =
    typeof params.burnDayLabel === "string" ? params.burnDayLabel.trim() : "";
  if (burnDay !== "") parts.push(burnDay);
  const facility =
    typeof params.facility === "string" ? params.facility.trim() : "";
  const role =
    typeof params.role === "string" ? titleCaseRole(params.role) : "";
  if (facility !== "") parts.push(facility);
  if (role !== "") parts.push(role);
  if (
    params.lastVisitDaysAgo !== null &&
    params.lastVisitDaysAgo !== undefined &&
    Number.isFinite(params.lastVisitDaysAgo)
  ) {
    parts.push(formatLastVisit(Math.max(0, Math.floor(params.lastVisitDaysAgo))));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

type Props = {
  name?: string | null;
  facility?: string | null;
  role?: string | null;
  lastVisitDaysAgo?: number | null;
  burnDayLabel?: string | null;
  unreadCount?: number;
  onAccountPress?: () => void;
};

/** iOS 26-style dashboard greeting with facility context and account avatar. */
export function DashboardWelcomeHeader({
  name,
  facility,
  role,
  lastVisitDaysAgo,
  burnDayLabel,
  unreadCount = 0,
  onAccountPress,
}: Props) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  const displayName = trimmed ? parseFirstWordTitleCase(trimmed) : "";
  const greeting = greetingForHour(new Date());
  const initial = trimmed ? initialFromName(trimmed) : "?";
  const headline =
    displayName !== "" ? `${greeting}, ${displayName}` : greeting;
  const subline = buildWelcomeSubline({
    facility,
    role,
    lastVisitDaysAgo,
    burnDayLabel,
  });
  const showBadge = unreadCount > 0;

  return (
    <View style={styles.row}>
      <View style={styles.textCol} accessibilityRole="header">
        <Text style={styles.headline}>{headline}</Text>
        {subline ? <Text style={styles.subline}>{subline}</Text> : null}
      </View>
      <View style={styles.avatarWrap}>
        <Pressable
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel={
            displayName
              ? `Open account menu for ${displayName}`
              : "Open account menu"
          }
          onPress={onAccountPress}
        >
          <Text style={styles.avatarLetter}>{initial}</Text>
        </Pressable>
        {showBadge ? (
          <View style={styles.badge} accessibilityLabel="Unread alerts" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: spacing.lg,
    width: "100%",
    alignSelf: "stretch",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
    paddingTop: 2,
  },
  headline: {
    color: IOS_BLACK,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
    ...Platform.select({
      ios: { fontFamily: undefined },
      android: { fontFamily: fontFamily.bold },
      default: { fontFamily: fontFamily.bold },
    }),
  },
  subline: {
    marginTop: 3,
    color: IOS_SUBLINE,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    ...Platform.select({
      ios: { fontFamily: undefined },
      android: { fontFamily: fontFamily.regular },
      default: { fontFamily: fontFamily.regular },
    }),
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: IOS_SYSTEM_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.1,
    ...Platform.select({
      ios: { fontFamily: undefined },
      android: { fontFamily: fontFamily.semiBold },
      default: { fontFamily: fontFamily.semiBold },
    }),
  },
  badge: {
    position: "absolute",
    top: -1,
    right: -1,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: IOS_BADGE_RED,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});

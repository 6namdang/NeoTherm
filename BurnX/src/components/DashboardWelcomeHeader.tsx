import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fontFamily } from "../theme/fontFamily";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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

/** First letter suitable for avatar (handles leading punctuation / spaces). */
function initialFromName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  const match = t.match(/[a-z]/i);
  return match ? match[0].toUpperCase() : t.charAt(0).toUpperCase();
}

type Props = {
  /** Prefer `me.name` from PostAuth once onboarding completed. */
  name?: string | null;
};

/** Time-based greeting plus circular initial avatar (patient & doctor dashboards). */
export function DashboardWelcomeHeader({ name }: Props) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  const displayName = trimmed ? parseFirstWordTitleCase(trimmed) : "";
  const greeting = greetingForHour(new Date());
  const initial = trimmed ? initialFromName(trimmed) : "?";

  return (
    <View style={styles.row}>
      <View style={styles.textCol} accessibilityRole="header">
        {displayName ? (
          <Text style={[styles.greetingWrap, typography.headlineMedium]}>
            <Text style={styles.greetingMuted}>{`${greeting}, `}</Text>
            <Text style={styles.namePart}>{displayName}</Text>
          </Text>
        ) : (
          <Text style={[styles.headlineAlone, typography.headlineMedium]}>
            {greeting}
          </Text>
        )}
      </View>
      <View
        style={styles.avatar}
        accessibilityLabel={
          displayName ? `Avatar, ${initial} for ${displayName}` : "Avatar, no name"
        }
      >
        <Text style={styles.avatarLetter}>{initial}</Text>
      </View>
    </View>
  );
}

const AVATAR = 52;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
    justifyContent: "center",
  },
  greetingWrap: {
    color: colors.text,
    flexWrap: "wrap",
  },
  greetingMuted: {
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
    fontSize: 26,
    letterSpacing: -0.45,
    lineHeight: 32,
  },
  namePart: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.45,
    lineHeight: 32,
  },
  headlineAlone: {
    color: colors.textSecondary,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: {
    color: colors.primaryForeground,
    fontFamily: fontFamily.bold,
    fontSize: 20,
    letterSpacing: 0.2,
  },
});
import { Platform, type ViewStyle } from "react-native";
import { colors } from "./colors";

/** Ultra-soft elevation — Stripe-like restraint */
export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    default: { elevation: 2 },
  }),
  cardRaised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    default: { elevation: 4 },
  }),
  button: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    default: { elevation: 3 },
  }),
} as const;

import type { TextStyle } from "react-native";
import { fontFamily } from "./fontFamily";

/** Inter-based scale — disciplined hierarchy; avoid sub-13px UI copy. */

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 38,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    lineHeight: 16,
  } satisfies TextStyle,
  headlineLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: -0.6,
    lineHeight: 38,
  } satisfies TextStyle,
  headlineMedium: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.45,
    lineHeight: 32,
  } satisfies TextStyle,
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 24,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,
  micro: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.35,
    lineHeight: 15,
  } satisfies TextStyle,
} as const;

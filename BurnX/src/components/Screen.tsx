import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export type ScreenPreset = "stack" | "tabs" | "materialTabs";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  preset?: ScreenPreset;
  keyboardAvoid?: boolean;
  /** Controlled entry motion — restrained (≈ Linear-level polish). */
  animateEntry?: boolean;
  /** Pass `<RefreshControl />` so screens can re-fetch remote source-of-truth data (e.g. Assignments). */
  refreshControl?: ScrollViewProps["refreshControl"];
  onScroll?: ScrollViewProps["onScroll"];
  scrollEventThrottle?: number;
}>;

function FadeMount({ children }: PropsWithChildren) {
  return (
    <Animated.View
      entering={FadeIn.duration(420).springify().damping(28).mass(1)}
      style={styles.mount}
    >
      {children}
    </Animated.View>
  );
}

export function Screen({
  children,
  scroll,
  preset = "stack",
  keyboardAvoid,
  animateEntry,
  refreshControl,
  onScroll,
  scrollEventThrottle = 16,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const bottomPad =
    preset === "tabs" || preset === "materialTabs"
      ? spacing.xxl + spacing.md + 12
      : Math.max(insets.bottom, spacing.lg) + spacing.xxl;

  const safeAreaEdges =
    preset === "materialTabs"
      ? (["left", "right"] as const)
      : (["top", "left", "right"] as const);

  const horizontalPad = spacing.xl;
  const topPad = spacing.xl;

  const keyboardOffset =
    Platform.OS === "ios" ? Math.max(insets.top, 12) : insets.bottom + 18;

  const scrollContentContainer = [
    styles.scrollInner,
    {
      paddingHorizontal: horizontalPad,
      paddingTop: topPad,
      paddingBottom: bottomPad,
      flexGrow: 1 as const,
    },
  ];

  const staticOuter = [
    styles.staticInner,
    {
      paddingHorizontal: horizontalPad,
      paddingTop: topPad,
      paddingBottom: bottomPad,
    },
  ];

  const bodyInner = animateEntry ? <FadeMount>{children}</FadeMount> : children;

  const shell = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      refreshControl={refreshControl}
      scrollEventThrottle={scrollEventThrottle}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={scrollContentContainer}
    >
      {bodyInner}
    </ScrollView>
  ) : (
    <View style={staticOuter}>{bodyInner}</View>
  );

  const wrapped =
    keyboardAvoid && Platform.OS === "ios" ? (
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
        style={styles.flexFill}
      >
        {shell}
      </KeyboardAvoidingView>
    ) : (
      shell
    );

  return (
    <SafeAreaView style={styles.screen} edges={safeAreaEdges}>
      <View style={styles.canvas} pointerEvents="none">
        <View style={styles.washTop} />
        <View style={styles.washBottom} />
      </View>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexFill: {
    flex: 1,
  },
  mount: {
    flexGrow: 1,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  washTop: {
    position: "absolute",
    top: -180,
    right: "-18%",
    width: "92%",
    height: 340,
    borderRadius: 200,
    backgroundColor: "#F0F6FA",
    opacity: 0.42,
  },
  washBottom: {
    position: "absolute",
    bottom: "-22%",
    left: "-26%",
    width: "92%",
    height: 340,
    borderRadius: 200,
    backgroundColor: colors.surfaceMuted,
    opacity: 0.38,
  },
  scrollInner: {
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  staticInner: {
    flex: 1,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
});

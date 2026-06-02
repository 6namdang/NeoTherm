import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

function tabLabel(
  options: MaterialTopTabBarProps["descriptors"][string]["options"],
  routeName: string,
): string {
  if (typeof options.tabBarLabel === "string") {
    return options.tabBarLabel;
  }
  if (options.title) {
    return options.title;
  }
  return routeName;
}

export function CareProgramsTabBar({
  state,
  navigation,
  descriptors,
}: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    const route = state.routes[state.index];
    const layout = chipLayoutsRef.current[route.key];
    if (!layout) return;

    scrollRef.current?.scrollTo({
      animated: true,
      x: Math.max(0, layout.x - spacing.md),
    });
  }, [state.index, state.routes]);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: insets.top + spacing.sm,
        },
      ]}
    >
      <View style={styles.track}>
        <ScrollView
          ref={scrollRef}
          horizontal
          contentContainerStyle={styles.scrollContent}
          showsHorizontalScrollIndicator={false}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = tabLabel(options, route.name);
            const accessibilityLabel = options.title ?? label;

            return (
              <Pressable
                key={route.key}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [
                  styles.chip,
                  focused && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  chipLayoutsRef.current[route.key] = { x, width };
                }}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => {
                  navigation.emit({
                    type: "tabLongPress",
                    target: route.key,
                  });
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    focused ? styles.chipTextActive : styles.chipTextIdle,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs / 2,
  },
  chip: {
    flexShrink: 0,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    minHeight: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipText: {
    ...typography.caption,
    fontFamily: typography.subtitle.fontFamily,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  chipTextActive: {
    color: colors.text,
  },
  chipTextIdle: {
    color: colors.textMuted,
  },
});

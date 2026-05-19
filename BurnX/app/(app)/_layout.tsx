import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Fragment } from "react";
import { Easing, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PatientEmaNotificationBootstrap } from "../../src/components/PatientEmaNotificationBootstrap";
import { bxLog } from "../../src/lib/debug-log";
import { colors } from "../../src/theme/colors";

type IonName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  focused,
  name,
  nameFocused,
}: {
  focused: boolean;
  name: IonName;
  nameFocused: IonName;
}) {
  return (
    <Ionicons color={focused ? colors.primary : colors.textMuted} name={focused ? nameFocused : name} size={22} />
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <Fragment>
      <PatientEmaNotificationBootstrap />
    <Tabs
      screenOptions={{
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 295,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
        },
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.15,
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.07,
              shadowRadius: 14,
            },
            default: { elevation: 10 },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          focus: () => bxLog("tabs", "focused", "Home"),
          tabPress: () => bxLog("tabs", "tabPress", "Home"),
        }}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="grid-outline" nameFocused="grid" />
          ),
        }}
      />
      <Tabs.Screen
        name="forms"
        listeners={{
          focus: () => bxLog("tabs", "focused", "Care programs"),
          tabPress: () => bxLog("tabs", "tabPress", "Care programs"),
        }}
        options={{
          title: "Care programs",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="reader-outline" nameFocused="reader" />
          ),
        }}
      />
      <Tabs.Screen
        name="image"
        listeners={{
          focus: () => bxLog("tabs", "focused", "Image"),
          tabPress: () => bxLog("tabs", "tabPress", "Image"),
        }}
        options={{
          title: "Image",
          href: Platform.OS === "web" ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="camera-outline" nameFocused="camera" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          focus: () => bxLog("tabs", "focused", "Profile"),
          tabPress: () => bxLog("tabs", "tabPress", "Profile"),
        }}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="person-circle-outline" nameFocused="person-circle" />
          ),
        }}
      />
      <Tabs.Screen
        name="voice-checkin"
        listeners={{
          focus: () => bxLog("tabs", "focused", "Voice check-in"),
          tabPress: () => bxLog("tabs", "tabPress", "Voice check-in"),
        }}
        options={{ href: null }}
      />
    </Tabs>
    </Fragment>
  );
}

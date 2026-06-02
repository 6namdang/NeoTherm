import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Easing, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bxLog } from "../../src/lib/debug-log";
import { colors } from "../../src/theme/colors";
import { DoctorPatientsProvider } from "../../src/state/doctor-patients-context";

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

export default function DoctorAppLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <DoctorPatientsProvider>
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
          focus: () => bxLog("tabs", "doctor focused", "Dashboard"),
          tabPress: () => bxLog("tabs", "doctor tabPress", "Dashboard"),
        }}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="pulse-outline" nameFocused="pulse" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          focus: () => bxLog("tabs", "doctor focused", "Personal"),
          tabPress: () => bxLog("tabs", "doctor tabPress", "Personal"),
        }}
        options={{
          title: "Personal",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="person-circle-outline"
              nameFocused="person-circle"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
    </Tabs>
    </DoctorPatientsProvider>
  );
}

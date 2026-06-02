import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { CareProgramsTabBar } from "../../../../src/components/navigation/CareProgramsTabBar";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

export default function CareProgramsTabsLayout() {
  return (
    <MaterialTopTabs
      screenOptions={{
        animationEnabled: true,
        lazyPreloadDistance: 1,
        swipeEnabled: true,
      }}
      tabBar={(props) => <CareProgramsTabBar {...props} />}
    >
      <MaterialTopTabs.Screen
        name="daily"
        options={{ tabBarLabel: "Daily", title: "Daily check-ins" }}
      />
      <MaterialTopTabs.Screen
        name="weekly"
        options={{ tabBarLabel: "Weekly", title: "Weekly check-ins" }}
      />
      <MaterialTopTabs.Screen
        name="long"
        options={{ tabBarLabel: "Long assessment", title: "Long assessment" }}
      />
      <MaterialTopTabs.Screen
        name="voice"
        options={{ tabBarLabel: "Voice", title: "Voice check-in" }}
      />
    </MaterialTopTabs>
  );
}

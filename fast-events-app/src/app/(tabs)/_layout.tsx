import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useTheme } from "@/hooks/use-theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              color={focused ? colors.primary : colors.textMuted}
              name="home-outline"
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { ThemeProvider } from "@/providers/theme-provider";

function AppNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

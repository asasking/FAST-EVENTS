import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme";

type ThemeToggleProps = {
  style?: StyleProp<ViewStyle>;
};

export function ThemeToggle({ style }: ThemeToggleProps) {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <Pressable
      accessibilityHint={`Switch to ${isDark ? "light" : "dark"} mode`}
      accessibilityLabel="Dark mode"
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>Dark mode</Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark ? colors.primary : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.surface,
              transform: [{ translateX: isDark ? 20 : 4 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  track: {
    borderRadius: radius.pill,
    height: 28,
    justifyContent: "center",
    width: 48,
  },
  thumb: {
    borderRadius: radius.pill,
    elevation: 2,
    height: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 20,
  },
});

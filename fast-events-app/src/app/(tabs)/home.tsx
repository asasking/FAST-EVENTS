import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { spacing } from "@/theme";

export default function HomeTab() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <AppHeader variant="home" />
        <View style={styles.placeholder}>
          <Text style={{ color: colors.text }}>Home screen placeholder</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  placeholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});

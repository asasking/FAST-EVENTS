import { Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";
import { spacing } from "@/theme";

export default function HomeTab() {
  const { colors } = useTheme();
  const { isLoading, session, signOut, storageError } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "We couldn't securely sign you out. Please try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.loading, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!session && storageError) {
    return (
      <SafeAreaView
        style={[styles.loading, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.energy, textAlign: "center" }}>
          {storageError}
        </Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <AppHeader
          onSignOut={handleSignOut}
          signingOut={isSigningOut}
          variant="authenticated"
        />
        {signOutError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.energy, textAlign: "center" }}
          >
            {signOutError}
          </Text>
        ) : null}
        {storageError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.energy, textAlign: "center" }}
          >
            {storageError}
          </Text>
        ) : null}
        <View style={styles.placeholder}>
          <Text style={{ color: colors.text }}>
            Welcome, {session.user.username}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
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

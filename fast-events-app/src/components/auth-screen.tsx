import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { fontSize, radius, spacing } from "@/theme";

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  variant: "login" | "signup";
}>;

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
};

type AuthNoticeProps = {
  children: string;
  tone?: "info" | "error";
};

export function AuthScreen({
  children,
  title,
  subtitle,
  variant,
}: AuthScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader variant={variant} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
            <View style={styles.form}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthButton({
  onPress,
  title,
  variant = "primary",
  disabled = false,
  loading = false,
}: AuthButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? colors.primary : colors.surfaceRaised,
          borderColor: isPrimary ? colors.primary : colors.border,
          opacity: pressed || isDisabled ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.onPrimary : colors.text}
          size="small"
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          { color: isPrimary ? colors.onPrimary : colors.text },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function AuthNotice({ children, tone = "info" }: AuthNoticeProps) {
  const { colors } = useTheme();

  return (
    <Text
      accessibilityRole={tone === "error" ? "alert" : "text"}
      style={[
        styles.notice,
        { color: tone === "error" ? colors.energy : colors.textSecondary },
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: 520,
    justifyContent: "center",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  card: {
    alignSelf: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 460,
    padding: spacing.lg,
    width: "100%",
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  notice: {
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: "center",
  },
});

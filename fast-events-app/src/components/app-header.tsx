import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/hooks/use-theme";
import { fontSize, radius, spacing } from "@/theme";

type AppHeaderProps = {
  variant: "home" | "login" | "signup";
};

type HeaderLinkProps = {
  href: "/login" | "/signup";
  label: string;
  prominent?: boolean;
};

export function AppHeader({ variant }: AppHeaderProps) {
  const { colors } = useTheme();
  const destination: HeaderLinkProps & { prompt: string } | null =
    variant === "login"
      ? { href: "/signup", prompt: "New here?", label: "Sign up" }
      : variant === "signup"
        ? { href: "/login", prompt: "Have an account?", label: "Log in" }
        : null;

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Ionicons color={colors.onPrimary} name="ticket-outline" size={20} />
        </View>
        <Text style={[styles.brandName, { color: colors.text }]}>
          <Text style={{ color: colors.primary }}>Fast</Text>Events
        </Text>
      </View>

      <View style={styles.actions}>
        <ThemeToggle style={styles.themeToggle} />
        {destination ? (
          <View style={styles.authLinks}>
            <Text style={[styles.prompt, { color: colors.textSecondary }]}>
              {destination.prompt}
            </Text>
            <HeaderLink
              href={destination.href}
              label={destination.label}
              prominent
            />
          </View>
        ) : (
          <View style={styles.authLinks}>
            <HeaderLink href="/login" label="Log in" />
            <HeaderLink href="/signup" label="Sign up" prominent />
          </View>
        )}
      </View>
    </View>
  );
}

function HeaderLink({ href, label, prominent = false }: HeaderLinkProps) {
  const { colors } = useTheme();

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([
          styles.link,
          prominent && [
            styles.prominentLink,
            { backgroundColor: colors.primary },
          ],
        ])}
      >
        <Text
          style={[
            styles.linkText,
            { color: prominent ? colors.onPrimary : colors.primary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 76,
    width: "100%",
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  brandMark: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  brandName: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  actions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  themeToggle: {
    width: 138,
  },
  authLinks: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 30,
  },
  prompt: {
    fontSize: fontSize.xs,
  },
  link: {
    alignItems: "center",
    borderRadius: radius.sm,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  prominentLink: {
    paddingHorizontal: spacing.md,
  },
  linkText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
});

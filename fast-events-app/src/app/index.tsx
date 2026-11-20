import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";
import { fontSize, radius, spacing } from "@/theme";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "@/utils/onboarding-storage";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isLoading: isAuthLoading, session } = useAuth();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (session) {
      router.replace("/home");
      return;
    }

    let isMounted = true;

    hasCompletedOnboarding()
      .then((hasCompleted) => {
        if (!isMounted) {
          return;
        }

        if (hasCompleted) {
          router.replace("/signup");
          return;
        }

        setIsCheckingOnboarding(false);
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage(
            "We couldn't check your welcome status. Tap Get started to continue.",
          );
          setIsCheckingOnboarding(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, router, session]);

  const handleGetStarted = async () => {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      await markOnboardingComplete();
      router.replace("/signup");
    } catch {
      setErrorMessage("We couldn't save your progress. Please try again.");
      setIsStarting(false);
    }
  };

  if (isCheckingOnboarding) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.loading, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader variant="home" />

        <View
          accessibilityLabel="Music and football events"
          style={styles.hero}
        >
          <EventPreviewCard
            category="LIVE MUSIC"
            icon="musical-notes"
            title="Live on stage"
            style={styles.musicCard}
          />
          <EventPreviewCard
            category="FOOTBALL"
            icon="football"
            title="Match day"
            style={styles.sportsCard}
          />
          <View
            style={[
              styles.worldBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons color={colors.accent} name="globe-outline" size={16} />
            <Text style={[styles.worldBadgeText, { color: colors.text }]}>
              Events everywhere
            </Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            YOUR WORLD OF EVENTS
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Every event.{"\n"}
            <Text style={{ color: colors.primary }}>Everywhere.</Text>
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Book and attend incredible events anywhere in the world—from live
            music and football to comedy and more.
          </Text>
        </View>

        <View style={styles.benefits}>
          <Benefit
            colors={colors}
            icon="person-add-outline"
            title="Join in seconds"
            description="Just your phone number and username."
          />
          <Benefit
            colors={colors}
            icon="card-outline"
            title="Pay your way"
            description="Fast, secure checkout in your local currency."
          />
        </View>

        {errorMessage ? (
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: colors.energy }]}
          >
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isStarting }}
          disabled={isStarting}
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.getStarted,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isStarting ? 0.8 : 1,
            },
          ]}
        >
          {isStarting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={[styles.getStartedText, { color: colors.onPrimary }]}>
                Get started
              </Text>
              <Ionicons
                color={colors.onPrimary}
                name="arrow-forward"
                size={20}
              />
            </>
          )}
        </Pressable>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          MUSIC  ·  FOOTBALL  ·  COMEDY  ·  AND MORE
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type EventPreviewCardProps = {
  category: string;
  icon: "musical-notes" | "football";
  title: string;
  style: StyleProp<ViewStyle>;
};

function EventPreviewCard({
  category,
  icon,
  title,
  style,
}: EventPreviewCardProps) {
  return (
    <View style={[styles.eventCard, style]}>
      <View style={styles.cardGlow} />
      <View style={styles.cardContent}>
        <View style={styles.eventIcon}>
          <Ionicons color="#FFFFFF" name={icon} size={28} />
        </View>
        <View>
          <Text style={styles.eventCategory}>{category}</Text>
          <Text style={styles.eventTitle}>{title}</Text>
        </View>
      </View>
      <View style={styles.cardDot} />
    </View>
  );
}

type BenefitProps = {
  colors: ReturnType<typeof useTheme>["colors"];
  icon: "person-add-outline" | "card-outline";
  title: string;
  description: string;
};

function Benefit({ colors, icon, title, description }: BenefitProps) {
  return (
    <View style={styles.benefit}>
      <View
        style={[
          styles.benefitIcon,
          { backgroundColor: colors.primarySubtle },
        ]}
      >
        <Ionicons color={colors.primary} name={icon} size={19} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={[styles.benefitTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  content: {
    alignSelf: "center",
    flexGrow: 1,
    maxWidth: 480,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    width: "100%",
  },
  hero: {
    alignItems: "center",
    height: 236,
    justifyContent: "center",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    position: "relative",
  },
  eventCard: {
    borderRadius: radius.lg,
    height: 194,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: spacing.md,
    position: "absolute",
    top: 28,
    width: "56%",
  },
  musicCard: {
    backgroundColor: "#241449",
    left: "4%",
    transform: [{ rotate: "-7deg" }],
    zIndex: 1,
  },
  sportsCard: {
    backgroundColor: "#10453D",
    right: "4%",
    transform: [{ rotate: "7deg" }],
    zIndex: 2,
  },
  cardGlow: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    height: 118,
    position: "absolute",
    right: -34,
    top: -34,
    width: 118,
  },
  cardContent: {
    gap: spacing.md,
  },
  eventIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.md,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  eventCategory: {
    color: "#C4B5FD",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  cardDot: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 5,
    opacity: 0.65,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 5,
  },
  worldBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    top: 4,
    zIndex: 3,
  },
  worldBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  intro: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 37,
    textAlign: "center",
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 24,
    marginTop: spacing.sm,
    maxWidth: 340,
    textAlign: "center",
  },
  benefits: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefit: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
  },
  benefitIcon: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  benefitDescription: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: 2,
  },
  error: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  getStarted: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    height: 54,
    justifyContent: "center",
    marginTop: "auto",
    gap: spacing.sm,
  },
  getStartedText: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  footer: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: spacing.md,
    textAlign: "center",
  },
});

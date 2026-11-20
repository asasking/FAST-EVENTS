import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ONBOARDING_COMPLETE_KEY = "fastevents.onboarding.complete";

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (Platform.OS === "web") {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true"
    );
  }

  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure storage is unavailable on this device.");
  }

  return (
    (await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)) === "true"
  );
}

export async function markOnboardingComplete(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      throw new Error("Browser storage is unavailable.");
    }

    window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    return;
  }

  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure storage is unavailable on this device.");
  }

  await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
}

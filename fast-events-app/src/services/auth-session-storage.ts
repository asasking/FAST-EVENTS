import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "@/services/auth-api";

const SESSION_KEY = "fastevents.auth.session.v1";
let webSession: AuthSession | null = null;

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const session = value as Record<string, unknown>;
  if (
    typeof session.access !== "string" ||
    typeof session.refresh !== "string"
  ) {
    return false;
  }
  const user = session.user;
  if (typeof user !== "object" || user === null || Array.isArray(user)) {
    return false;
  }
  const profile = user as Record<string, unknown>;
  return (
    typeof profile.id === "number" &&
    typeof profile.username === "string" &&
    typeof profile.phone_number === "string" &&
    typeof profile.phone_number_verified === "boolean" &&
    typeof profile.country === "string" &&
    typeof profile.currency === "string"
  );
}

async function ensureSecureStoreAvailable(): Promise<void> {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure storage is unavailable on this device.");
  }
}

export async function readAuthSession(): Promise<AuthSession | null> {
  if (Platform.OS === "web") {
    return webSession;
  }

  await ensureSecureStoreAvailable();
  const serializedSession = await SecureStore.getItemAsync(SESSION_KEY);
  if (!serializedSession) {
    return null;
  }

  let parsedSession: unknown;
  try {
    parsedSession = JSON.parse(serializedSession);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }

  if (!isAuthSession(parsedSession)) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
  return parsedSession;
}

export async function writeAuthSession(session: AuthSession): Promise<void> {
  if (Platform.OS === "web") {
    webSession = session;
    return;
  }

  await ensureSecureStoreAvailable();
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function deleteAuthSession(): Promise<void> {
  if (Platform.OS === "web") {
    webSession = null;
    return;
  }

  await ensureSecureStoreAvailable();
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

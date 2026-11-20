import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import type { AuthSession } from "@/services/auth-api";
import {
  AuthApiError,
  getCurrentUser,
  refreshAuthTokens,
  revokeAuthSession,
} from "@/services/auth-api";
import {
  deleteAuthSession,
  readAuthSession,
  writeAuthSession,
} from "@/services/auth-session-storage";

type AuthContextValue = {
  session: AuthSession | null;
  isLoading: boolean;
  storageError: string | null;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);

  const updateSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const validateSavedSession = async (savedSession: AuthSession) => {
      let activeSession = savedSession;
      try {
        let currentUser;
        try {
          currentUser = await getCurrentUser(activeSession.access);
        } catch (error) {
          if (!(error instanceof AuthApiError) || error.status !== 401) {
            return;
          }
          const tokens = await refreshAuthTokens(activeSession.refresh);
          activeSession = { ...activeSession, ...tokens };
          currentUser = await getCurrentUser(activeSession.access);
        }

        if (
          !isMounted ||
          sessionRef.current?.refresh !== savedSession.refresh
        ) {
          return;
        }
        const updatedSession = { ...activeSession, user: currentUser };
        updateSession(updatedSession);
        try {
          await writeAuthSession(updatedSession);
        } catch (error) {
          if (isMounted) {
            setStorageError(
              error instanceof Error
                ? error.message
                : "The refreshed sign-in could not be saved securely.",
            );
          }
        }
      } catch (error) {
        if (
          !(error instanceof AuthApiError) ||
          (error.status !== 400 && error.status !== 401) ||
          !isMounted ||
          sessionRef.current?.refresh !== savedSession.refresh
        ) {
          return;
        }

        try {
          await deleteAuthSession();
          updateSession(null);
        } catch (storageFailure) {
          setStorageError(
            storageFailure instanceof Error
              ? storageFailure.message
              : "The expired sign-in could not be cleared from secure storage.",
          );
        }
      }
    };

    readAuthSession()
      .then((savedSession) => {
        if (isMounted) {
          updateSession(savedSession);
          if (savedSession) {
            void validateSavedSession(savedSession);
          }
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setStorageError(
            error instanceof Error
              ? error.message
              : "Secure sign-in storage is unavailable.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [updateSession]);

  const signIn = useCallback(async (nextSession: AuthSession) => {
    await writeAuthSession(nextSession);
    updateSession(nextSession);
    setStorageError(null);
  }, [updateSession]);

  const signOut = useCallback(async () => {
    if (!session) {
      return;
    }

    let activeSession = session;
    try {
      await revokeAuthSession(activeSession);
    } catch (error) {
      if (!(error instanceof AuthApiError) || error.status !== 401) {
        throw error;
      }

      const refreshedTokens = await refreshAuthTokens(activeSession.refresh);
      activeSession = { ...activeSession, ...refreshedTokens };
      await writeAuthSession(activeSession);
      updateSession(activeSession);
      await revokeAuthSession(activeSession);
    }

    await deleteAuthSession();
    updateSession(null);
    setStorageError(null);
  }, [session, updateSession]);

  return (
    <AuthContext.Provider
      value={{ session, isLoading, storageError, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

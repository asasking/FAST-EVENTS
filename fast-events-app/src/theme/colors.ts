export type ThemeMode = "light" | "dark";

export const colors = {
  light: {
    primary: "#5B21B6",
    primaryPressed: "#4C1D95",
    primarySubtle: "#F3E8FF",
    accent: "#0EA5E9",
    accentSubtle: "#E0F2FE",
    energy: "#FF4D00",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",
    border: "#E2E8F0",
    success: "#10B981",
    onPrimary: "#FFFFFF",
  },
  dark: {
    primary: "#7C3AED",
    primaryPressed: "#6D28D9",
    primarySubtle: "#2B1B4D",
    accent: "#38BDF8",
    accentSubtle: "#0C3448",
    energy: "#FF6B2B",
    background: "#090D16",
    surface: "#131B2E",
    surfaceRaised: "#1B263B",
    text: "#F1F5F9",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    border: "#273449",
    success: "#34D399",
    onPrimary: "#FFFFFF",
  },
} as const;

export type ThemeColors = (typeof colors)[ThemeMode];

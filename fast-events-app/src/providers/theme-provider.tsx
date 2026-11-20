import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { colors, type ThemeColors, type ThemeMode } from "@/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const toggleTheme = useCallback(() => {
    setMode((currentMode) => (currentMode === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colors: colors[mode],
      isDark: mode === "dark",
      toggleTheme,
    }),
    [mode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

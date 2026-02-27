/**
 * Theme context — four themes: serene, dark, light, cyberpunk.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "serene" | "dark" | "light" | "cyberpunk" | "lyx";
export const THEMES: { id: Theme; label: string }[] = [
  { id: "serene", label: "Network" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "cyberpunk", label: "Cyber Punk" },
  { id: "lyx", label: "Lyx" },
];

const STORAGE_KEY = "ohana-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_THEME: Theme = "serene";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && THEMES.some((t) => t.id === stored)) return stored as Theme;
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEMES.findIndex((t) => t.id === prev);
      const next = THEMES[(idx + 1) % THEMES.length];
      return next.id;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

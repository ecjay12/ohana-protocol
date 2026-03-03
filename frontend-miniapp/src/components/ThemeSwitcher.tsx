/**
 * Theme switcher dropdown. Updates data-theme on document root.
 * Persists choice to localStorage so theme stays when miniapp is added to profile (same origin in iframe).
 */
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export const THEME_STORAGE_KEY = "ohana-miniapp-theme";

export const THEMES = [
  { id: "serene", label: "Network" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "cyberpunk", label: "Cyber Punk" },
  { id: "lyx", label: "Lyx" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "serene";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  } catch {
    // ignore
  }
  return "serene";
}

export function useTheme(): ThemeId {
  const [searchParams] = useSearchParams();
  const urlTheme = searchParams.get("theme");
  const storedTheme = getStoredTheme();
  const themeParam = urlTheme ?? storedTheme;
  return THEMES.some((t) => t.id === themeParam) ? (themeParam as ThemeId) : "serene";
}

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTheme = searchParams.get("theme");
  const storedTheme = getStoredTheme();
  const themeParam = urlTheme ?? storedTheme;
  const theme = THEMES.some((t) => t.id === themeParam) ? (themeParam as ThemeId) : "serene";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ThemeId;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set("theme", next);
      return nextParams;
    });
  };

  return (
    <select
      value={theme}
      onChange={handleChange}
      className={`rounded border border-theme-border bg-theme-surface px-3 py-1.5 text-sm text-theme-text ${className}`}
      aria-label="Select theme"
    >
      {THEMES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

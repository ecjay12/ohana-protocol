/**
 * Theme switcher dropdown. Updates data-theme on document root.
 */
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export const THEMES = [
  { id: "cyberpunk", label: "Cyberpunk Neon" },
  { id: "nature", label: "Nature & Glass" },
  { id: "gold", label: "Gold & Luxury" },
  { id: "minimal", label: "Minimalist" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const themeParam = searchParams.get("theme") ?? "cyberpunk";
  const theme = THEMES.some((t) => t.id === themeParam) ? themeParam : "cyberpunk";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ThemeId;
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

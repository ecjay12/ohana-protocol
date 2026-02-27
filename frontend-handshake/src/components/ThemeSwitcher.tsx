/**
 * Theme switcher — serene, dark, light, cyberpunk.
 */

import { Palette } from "lucide-react";
import { useTheme, THEMES } from "@/contexts/ThemeContext";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-theme-text-muted">
        <Palette className="h-4 w-4" />
        Theme
      </div>
      <div className="flex flex-wrap gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              theme === t.id
                ? "border border-theme-accent bg-theme-accent-soft text-theme-accent"
                : "bg-theme-surface text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

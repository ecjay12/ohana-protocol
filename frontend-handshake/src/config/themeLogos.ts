import type { Theme } from "@/contexts/ThemeContext";

// Logo assets live in frontend-handshake/public/logos/.
// Map each theme to its corresponding logo image path.
export const THEME_LOGOS: Record<Theme, string> = {
  serene: "/logos/serene.png",
  dark: "/logos/dark.png",
  light: "/logos/light.png",
  cyberpunk: "/logos/cyberpunk.png",
  lyx: "/logos/lyx.png",
};


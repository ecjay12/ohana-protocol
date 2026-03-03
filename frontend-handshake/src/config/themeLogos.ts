import type { Theme } from "@/contexts/ThemeContext";

// Logo assets live in frontend-handshake/public/logos/.
// Map each theme to its corresponding logo image path.
export const THEME_LOGOS: Record<Theme, string> = {
  // Filenames match the PNGs you added under public/logos
  serene: "/logos/serene copy.png",
  dark: "/logos/dark.png",
  light: "/logos/light copy.png",
  cyberpunk: "/logos/cyber punk.png",
  lyx: "/logos/lyx.png",
};


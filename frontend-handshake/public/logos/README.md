This folder holds the theme-specific Handshake logo images used in the frontend.

**Favicon / PWA icon:** The site uses `/favicon.svg` in the project root (`public/favicon.svg`) so the tab icon matches the Handshake mark without extra PNGs. To use your exported **serene** PNG as the favicon instead, replace `public/favicon.svg` or add `favicon.ico` / PNGs and update `index.html` + `manifest.json`.

Expected files (all **PNG**, square, transparent background recommended):

- `serene.png`    — green / network theme logo
- `dark.png`      — dark / blue logo
- `light.png`     — light / silver logo
- `cyberpunk.png` — cyberpunk / purple-blue logo
- `lyx.png`       — LYX / pink logo

**Recommended size**

- Source images: **512×512 px** (or larger, square).  
- The UI renders them at about **24×24 px** (`h-6 w-6` in Tailwind), so any larger square icon will be downscaled cleanly.

Once these files are placed here, the app automatically shows the correct logo for the active theme in:

- The main sidebar header
- The mobile header title bar


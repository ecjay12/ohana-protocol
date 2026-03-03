import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// Set theme on load: localStorage (persists when added to profile) > URL param > default (browser only)
if (typeof document !== "undefined") {
  const THEME_STORAGE_KEY = "ohana-miniapp-theme";
  const themes = ["serene", "dark", "light", "cyberpunk", "lyx"];
  let theme = "serene";
  try {
    const stored = typeof window !== "undefined" && localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && themes.includes(stored)) theme = stored;
  } catch {
    // ignore
  }
  const urlTheme = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("theme") : null;
  if (urlTheme && themes.includes(urlTheme)) theme = urlTheme;
  document.documentElement.setAttribute("data-theme", theme);
  if (typeof window !== "undefined" && window.self !== window.top) {
    document.documentElement.classList.add("miniapp-embedded");
  }
}

// Suppress "No UP found" from @lukso/up-provider when not in a LUKSO parent (e.g. standalone/Vercel preview)
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (ev) => {
    const msg = ev.reason?.message ?? String(ev.reason ?? "");
    if (msg.includes("No UP found") || msg.includes("UP found")) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

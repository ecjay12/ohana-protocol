import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// Set default theme on load (matches Handshake full site)
const urlParams = new URLSearchParams(window.location.search);
const theme = urlParams.get("theme") ?? "serene";
document.documentElement.setAttribute("data-theme", theme);

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

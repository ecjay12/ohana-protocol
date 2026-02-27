import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Log environment variables for debugging (don't log actual keys)
console.log("Environment check:", {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  hasPinataKey: !!import.meta.env.VITE_PINATA_JWT,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

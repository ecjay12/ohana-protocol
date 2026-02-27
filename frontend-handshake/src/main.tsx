import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ActivityToastProvider } from "./contexts/ActivityToastContext";
import { ActivityToastContainer } from "./components/ActivityToast";
import { Network } from "./components/Network";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import App from "./App";

function AppWithBackground() {
  const { theme } = useTheme();
  return (
    <>
      {theme === "serene" && <Network />}
      <div className="relative z-10 min-h-screen">
        <App />
      </div>
    </>
  );
}

function RootErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
        <p className="mb-4 text-sm text-gray-400">
          Check the browser console for details. Try refreshing or switching to a different theme.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<RootErrorFallback />}>
      <BrowserRouter>
        <ThemeProvider>
          <ActivityToastProvider>
            <AppWithBackground />
            <ActivityToastContainer />
          </ActivityToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

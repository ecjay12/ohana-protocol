/**
 * Activity toast context — popups for engagement (vouch sent, accepted, pending, etc.)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ToastType = "success" | "info" | "engagement";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ActivityToastContextValue {
  toasts: Toast[];
  showToast: (message: string, options?: { type?: ToastType; action?: Toast["action"]; duration?: number }) => void;
  dismissToast: (id: string) => void;
}

const ActivityToastContext = createContext<ActivityToastContextValue | null>(null);

export function useActivityToast() {
  const ctx = useContext(ActivityToastContext);
  if (!ctx) throw new Error("useActivityToast must be used within ActivityToastProvider");
  return ctx;
}

export function ActivityToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      options?: { type?: ToastType; action?: Toast["action"]; duration?: number }
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = {
        id,
        message,
        type: options?.type ?? "info",
        action: options?.action,
        duration: options?.duration ?? 5000,
      };
      setToasts((prev) => [...prev.slice(-2), toast]); // Keep max 3 visible
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => dismissToast(id), toast.duration);
      }
    },
    [dismissToast]
  );

  return (
    <ActivityToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ActivityToastContext.Provider>
  );
}

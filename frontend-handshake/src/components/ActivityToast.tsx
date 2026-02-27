/**
 * Activity toast popups — slide-in from bottom-right, auto-dismiss.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Info, Sparkles } from "lucide-react";
import { useActivityToast, type ToastType } from "@/contexts/ActivityToastContext";

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    case "engagement":
      return <Sparkles className="h-5 w-5 text-theme-accent" />;
    default:
      return <Info className="h-5 w-5 text-theme-accent" />;
  }
}

export function ActivityToastContainer() {
  const { toasts, dismissToast } = useActivityToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2"
      aria-live="polite"
      aria-label="Activity notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex min-w-[280px] max-w-sm items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-4 shadow-theme-glow backdrop-blur-xl"
          >
            <ToastIcon type={toast.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-text">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className="mt-2 text-xs font-medium text-theme-accent hover:underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded p-1 text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

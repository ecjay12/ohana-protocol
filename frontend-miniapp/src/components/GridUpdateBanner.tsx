/**
 * Dismissible CTA to add or refresh the Handshake LSP28 grid tile (fixes propagate on next on-chain write).
 */
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { X, LayoutGrid } from "lucide-react";
import { addToGridAbsoluteUrl } from "@/config/contracts";

const STORAGE_EMBED = "ohana-miniapp-grid-banner-dismissed-embed-v2";
const STORAGE_STANDALONE = "ohana-miniapp-grid-banner-dismissed-standalone-v2";

function readDismissed(embedded: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(embedded ? STORAGE_EMBED : STORAGE_STANDALONE) === "1";
  } catch {
    return false;
  }
}

interface GridUpdateBannerProps {
  /** True when running inside LUKSO Grid iframe */
  embedded: boolean;
  className?: string;
}

export function GridUpdateBanner({ embedded, className = "" }: GridUpdateBannerProps) {
  const [dismissed, setDismissed] = useState(() => readDismissed(embedded));

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(embedded ? STORAGE_EMBED : STORAGE_STANDALONE, "1");
    } catch {
      /* ignore quota / private mode */
    }
    setDismissed(true);
  }, [embedded]);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label={embedded ? "Update your profile grid tile" : "Add Handshake to your profile"}
      className={`miniapp-grid-banner relative w-full max-w-[520px] shrink-0 rounded-xl border border-theme-accent/35 bg-theme-accent-soft/25 px-3 py-3 shadow-sm sm:max-w-[600px] sm:px-4 ${className}`}
    >
      <button
        type="button"
        onClick={dismiss}
        className="miniapp-icon-btn absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text"
        aria-label="Dismiss banner"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex gap-2 pr-10">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
          <LayoutGrid className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-theme-text">
            {embedded ? "Refresh your Grid tile" : "Add Handshake to your profile"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-theme-text-muted">
            {embedded
              ? "If you added Handshake a while ago, update once so your tile gets the latest iframe settings (one signed transaction). Opens in a new tab so your wallet can connect."
              : "Put Handshake on your LUKSO home screen so visitors can vouch from your profile—works in the mobile app and on the web."}
          </p>
          {embedded ? (
            <a
              href={addToGridAbsoluteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="miniapp-btn-primary mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-semibold sm:w-auto sm:min-w-[12rem]"
            >
              Update Grid (new tab)
            </a>
          ) : (
            <Link
              to="/add-to-grid"
              className="miniapp-btn-primary mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-center text-sm font-semibold sm:w-auto sm:min-w-[12rem]"
            >
              Add to my Grid
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

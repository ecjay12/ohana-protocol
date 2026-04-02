/**
 * Teaser for writing vouch summary into UP identity metadata (LSP2) — not shipped yet.
 */
import { Sparkles } from "lucide-react";

export function ProfileIdentityComingSoonCard() {
  return (
    <div className="glass-card rounded-2xl border border-dashed border-theme-border bg-theme-background/40 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-surface-strong text-theme-text-muted">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Coming soon
          </p>
          <h2 className="mt-1 text-lg font-semibold text-theme-text">
            Show vouches in your profile details (coming soon)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
            Soon you&apos;ll be able to attach a short Handshake summary to the detailed profile
            fields on your Universal Profile—not just the app grid. We&apos;re building this; check
            back or ask on{" "}
            <a
              href="https://app.cg/c/OhanaDao/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-accent hover:underline"
            >
              Common Ground
            </a>{" "}
            for updates.
          </p>
        </div>
      </div>
    </div>
  );
}

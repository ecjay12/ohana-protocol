/**
 * Explains linking extra wallets (EOAs) to a Universal Profile so vouches show in one place.
 */
import { Link } from "react-router-dom";
import { Wallet, ArrowRight } from "lucide-react";

export function ProfileAddWalletsCard() {
  return (
    <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent">
          <Wallet className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-theme-text">Add wallets to your profile</h2>
          <p className="mt-2 text-sm leading-relaxed text-theme-text-muted content-safe">
            Use more than one address? Link them to your Universal Profile so vouches show in one
            place. You keep your keys—we never hold them.
          </p>
          <Link
            to="/up-identity"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-theme-accent/40 bg-theme-accent-soft/50 px-4 py-2.5 text-sm font-medium text-theme-accent transition-colors hover:bg-theme-accent-soft"
          >
            Link wallets
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

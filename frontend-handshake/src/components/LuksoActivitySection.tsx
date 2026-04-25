/**
 * Discovery feed: recent LSP28 grid updates, UP follows, and Handshake vouches (LUKSO).
 */

import { Link } from "react-router-dom";
import { LayoutGrid, BadgeCheck, Sparkles } from "lucide-react";
import { useLuksoActivityFeed } from "@/hooks/useLuksoActivityFeed";
import type { LuksoActivityItem } from "@/lib/lspIndexerActivity";

function shortAddr(a: string) {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function displayName(p: { address: string; name: string | null }) {
  return p.name?.trim() || shortAddr(p.address);
}

function relTime(atMs: number): string {
  const d = (Date.now() - atMs) / 1000;
  if (!Number.isFinite(d) || d < 0) return "";
  if (d < 45) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return `${Math.floor(d / 604800)}w ago`;
}

function renderItem(item: LuksoActivityItem) {
  const time = <span className="shrink-0 text-xs text-theme-dim tabular-nums">{relTime(item.atMs)}</span>;

  if (item.kind === "grid") {
    return (
      <li key={item.id} className="flex gap-3 border-b border-theme-border py-3 last:border-0">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
          <LayoutGrid className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 text-sm leading-snug text-theme-text">
          <Link to={`/profile/${item.profile.address}`} className="font-medium text-theme-accent hover:underline">
            {displayName(item.profile)}
          </Link>
          <span className="text-theme-text-muted"> added Handshake to their profile grid</span>
        </div>
        {time}
      </li>
    );
  }

  return (
    <li key={item.id} className="flex gap-3 border-b border-theme-border py-3 last:border-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
        <BadgeCheck className="h-4 w-4" aria-hidden />
      </div>
        <div className="min-w-0 flex-1 text-sm leading-snug text-theme-text">
        <Link to={`/profile/${item.voucher.address}`} className="font-medium text-theme-accent hover:underline">
          {displayName(item.voucher)}
        </Link>
        <span className="text-theme-text-muted"> → </span>
        <Link to={`/profile/${item.target.address}`} className="font-medium text-theme-accent hover:underline">
          {displayName(item.target)}
        </Link>
        <span className="text-theme-text-muted"> — vouch accepted</span>
      </div>
      {time}
    </li>
  );
}

export interface LuksoActivitySectionProps {
  /** Tighter padding / typography for dashboard column */
  compact?: boolean;
}

export function LuksoActivitySection({ compact = false }: LuksoActivitySectionProps) {
  const { items, loading, error } = useLuksoActivityFeed();

  return (
    <section
      className={`rounded-2xl border border-theme-border bg-theme-surface ${compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}
      aria-labelledby="lukso-activity-heading"
    >
      <div className={`mb-4 flex items-start gap-3 ${compact ? "" : "sm:items-center"}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2
            id="lukso-activity-heading"
            className={`font-semibold text-theme-text ${compact ? "text-base" : "text-lg"}`}
          >
            Recent Handshake activity
          </h2>
          <p className="mt-1 text-sm text-theme-text-muted">
            Grid: Handshake miniapp on a Universal Profile. Vouches: accepted endorsements on Handshake. Names come from
            the LUKSO indexer.
          </p>
        </div>
      </div>

      {loading && (
        <p className={`text-theme-text-muted ${compact ? "text-xs" : "text-sm"}`}>Loading activity…</p>
      )}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-theme-text-muted">No activity to show right now.</p>
      )}
      {!loading && items.length > 0 && (
        <ul className="divide-theme-border" role="list">
          {items.map((item) => renderItem(item))}
        </ul>
      )}
    </section>
  );
}

/**
 * Discovery feed: recent LSP28 grid updates, UP follows, and Handshake vouches (LUKSO).
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, BadgeCheck, Sparkles } from "lucide-react";
import { useLuksoActivityFeed } from "@/hooks/useLuksoActivityFeed";
import { useIndexerLuksoFields } from "@/hooks/useIndexerDisplayNames";
import { isShortAddressLabel } from "@/lib/upDisplayLabel";
import type { LuksoActivityItem } from "@/lib/lspIndexerActivity";

function shortAddr(a: string) {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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

function labelFor(
  p: { address: string; name: string | null },
  indexer: Record<string, string>
) {
  const n = p.name?.trim();
  if (n) return n;
  const i = indexer[p.address.toLowerCase()];
  if (i && !isShortAddressLabel(i)) return i;
  return i || shortAddr(p.address);
}

function labelClass(label: string) {
  return isShortAddressLabel(label) ? "font-mono" : "font-medium";
}

function faceOr(
  avatars: Record<string, string | null>,
  address: string,
  icon: "grid" | "vouch"
) {
  const u = avatars[address.toLowerCase()]?.trim();
  if (u) {
    return (
      <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-theme-border/80">
        <img
          src={u}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  if (icon === "grid") {
    return (
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
        <LayoutGrid className="h-4 w-4" aria-hidden />
      </div>
    );
  }
  return (
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-accent-soft text-theme-accent">
      <BadgeCheck className="h-4 w-4" aria-hidden />
    </div>
  );
}

function renderItem(
  item: LuksoActivityItem,
  indexer: Record<string, string>,
  avatars: Record<string, string | null>
) {
  const time = <span className="shrink-0 text-xs text-theme-dim tabular-nums">{relTime(item.atMs)}</span>;

  if (item.kind === "grid") {
    const lg = labelFor(item.profile, indexer);
    return (
      <li key={item.id} className="flex gap-3 border-b border-theme-border py-3 last:border-0">
        {faceOr(avatars, item.profile.address, "grid")}
        <div className="min-w-0 flex-1 text-sm leading-snug text-theme-text">
          <Link
            to={`/profile/${item.profile.address}`}
            className={`text-theme-accent hover:underline ${labelClass(lg)}`}
          >
            {lg}
          </Link>
          <span className="text-theme-text-muted"> added Handshake to their profile grid</span>
        </div>
        {time}
      </li>
    );
  }

  const v = labelFor(item.voucher, indexer);
  const t = labelFor(item.target, indexer);
  const aV = avatars[item.voucher.address.toLowerCase()]?.trim();
  const aT = avatars[item.target.address.toLowerCase()]?.trim();
  return (
    <li key={item.id} className="flex gap-3 border-b border-theme-border py-3 last:border-0">
      <div className="mt-0.5 flex shrink-0 -space-x-1.5">
        {aV ? (
          <div className="h-7 w-7 overflow-hidden rounded-full border-2 border-theme-surface ring-1 ring-theme-border/80">
            <img src={aV} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-theme-surface bg-theme-accent-soft text-theme-accent">
            <BadgeCheck className="h-3 w-3" aria-hidden />
          </div>
        )}
        {aT ? (
          <div className="h-7 w-7 overflow-hidden rounded-full border-2 border-theme-surface ring-1 ring-theme-border/80">
            <img src={aT} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 border-theme-surface bg-theme-surface-strong text-theme-dim">
            <span className="text-[9px] font-mono" aria-hidden>
              →
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm leading-snug text-theme-text">
        <Link
          to={`/profile/${item.voucher.address}`}
          className={`text-theme-accent hover:underline ${labelClass(v)}`}
        >
          {v}
        </Link>
        <span className="text-theme-text-muted"> → </span>
        <Link
          to={`/profile/${item.target.address}`}
          className={`text-theme-accent hover:underline ${labelClass(t)}`}
        >
          {t}
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

  const activityAddresses = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      if (it.kind === "grid") s.add(it.profile.address);
      else {
        s.add(it.voucher.address);
        s.add(it.target.address);
      }
    }
    return [...s];
  }, [items]);

  const { labels: indexerLabels, avatarUrls: indexerAvatars } = useIndexerLuksoFields(
    activityAddresses,
    {
      enabled: activityAddresses.length > 0,
    }
  );

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
          {items.map((item) => renderItem(item, indexerLabels, indexerAvatars))}
        </ul>
      )}
    </section>
  );
}

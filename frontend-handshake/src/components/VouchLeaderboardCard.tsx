/**
 * Top profiles by Handshake accepted vouch count, summed across all configured chains.
 * Data from GET /api/vouch-leaderboard (server snapshot + indexer enrichment, ~12h refresh).
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Users, Loader2 } from "lucide-react";
import {
  fetchVouchLeaderboardFromApi,
  VOUCH_LEADERBOARD_TOP,
  type VouchLeaderboardRow,
} from "@/lib/vouchLeaderboard";
import type { IndexerLeaderboardProfile } from "@/lib/lspIndexerProfiles";
import { useIndexerLuksoFields } from "@/hooks/useIndexerDisplayNames";
import { isShortAddressLabel } from "@/lib/upDisplayLabel";

export type { VouchLeaderboardRow };

function shortAddr(a: string) {
  const s = a.trim();
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

interface VouchLeaderboardCardProps {
  limit?: number;
  compact?: boolean;
}

export function VouchLeaderboardCard({
  limit = VOUCH_LEADERBOARD_TOP,
  compact = false,
}: VouchLeaderboardCardProps) {
  const [rows, setRows] = useState<VouchLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** From API response (same shape as indexer row) */
  const [profilesByAddr, setProfilesByAddr] = useState<Record<string, IndexerLeaderboardProfile>>({});

  const limitKey = useMemo(
    () => Math.min(VOUCH_LEADERBOARD_TOP, Math.max(1, limit)),
    [limit]
  );

  const rowAddresses = useMemo(() => rows.map((r) => r.address), [rows]);
  const { labels: indexerNameByAddr, avatarUrls: indexerAvatarByAddr } = useIndexerLuksoFields(
    rowAddresses,
    {
      enabled: rowAddresses.length > 0,
    }
  );

  const reqSeq = useRef(0);
  useEffect(() => {
    const ac = new AbortController();
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    setProfilesByAddr({});
    fetchVouchLeaderboardFromApi(limitKey, { signal: ac.signal })
      .then((data) => {
        if (reqSeq.current !== seq) return;
        if (data.error) setError(data.error);
        setRows(data.rows ?? []);
        setProfilesByAddr(data.profiles ?? {});
      })
      .catch((e: unknown) => {
        if (!ac.signal.aborted && reqSeq.current === seq) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      })
      .finally(() => {
        if (reqSeq.current === seq) setLoading(false);
      });
    return () => {
      ac.abort();
    };
  }, [limitKey]);

  const inner = (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 shrink-0 text-theme-accent" aria-hidden />
        <h2 className="text-base font-semibold text-theme-text">Vouch leaderboard</h2>
      </div>
      <p className="mb-4 text-xs leading-snug text-theme-text-muted content-safe">
        Top {VOUCH_LEADERBOARD_TOP} by vouches · updates ~12h
      </p>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-theme-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-theme-text-muted">
          No accepted vouches found across these networks yet.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <ol className={`divide-y divide-theme-border/80 ${compact ? "text-sm" : ""}`}>
          {rows.map((r, i) => {
            const idx = profilesByAddr[r.address.toLowerCase()];
            const fromApi = idx?.name?.trim();
            const fromIndexer = indexerNameByAddr[r.address.toLowerCase()];
            const name = fromApi || fromIndexer || shortAddr(r.address);
            const followers = idx ? idx.followerCount.toLocaleString() : "—";
            const following = idx ? idx.followingCount.toLocaleString() : "—";
            const vouches = r.acceptedVouches.toLocaleString();
            const avatarUrl =
              idx?.avatarUrl?.trim() || indexerAvatarByAddr[r.address.toLowerCase()]?.trim() || null;

            return (
              <li key={`${r.address}-${i}`}>
                <Link
                  to={`/profile/${r.address}`}
                  className={`flex min-w-0 items-center gap-2 sm:gap-3 ${compact ? "py-2" : "py-2.5"} -mx-1 rounded-lg px-1 outline-none transition-colors hover:bg-theme-surface-strong/60`}
                >
                  <span
                    className={`w-5 shrink-0 text-right font-mono tabular-nums text-theme-text-dim ${compact ? "text-[10px]" : "text-xs"}`}
                  >
                    {i + 1}
                  </span>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className={`shrink-0 rounded-full object-cover ring-1 ring-theme-border ${compact ? "h-7 w-7" : "h-9 w-9"}`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`shrink-0 rounded-full bg-theme-surface-strong ring-1 ring-theme-border ${compact ? "h-7 w-7" : "h-9 w-9"}`}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-theme-text ${!isShortAddressLabel(name) ? "font-medium" : "font-mono text-sm"}`}
                    >
                      {name}
                    </div>
                    <p
                      className={`text-theme-text-muted leading-snug ${compact ? "text-[10px]" : "text-xs"}`}
                    >
                      {followers} followers · {following} following · {vouches} vouches
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  if (compact) {
    return <div className="text-left">{inner}</div>;
  }

  return (
    <div className="glass-card min-w-0 rounded-2xl border border-theme-border bg-theme-surface p-3 shadow-sm sm:p-4">
      {inner}
    </div>
  );
}

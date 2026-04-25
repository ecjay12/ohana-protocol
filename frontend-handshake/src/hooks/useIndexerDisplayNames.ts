/**
 * Batched LSP3 display names from the Hasura indexer (same source as leaderboard / activity).
 * Use anywhere you have addresses and want a human name without hitting RPC for every read.
 *
 * @example
 * const labels = useIndexerDisplayNames([addrA, addrB]);
 * const labelA = labels[addrA.toLowerCase()];
 */

import { useEffect, useMemo, useState } from "react";
import { fetchLuksoProfilesFromIndexer, type IndexerLeaderboardProfile } from "@/lib/lspIndexerProfiles";

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * @returns Map of **lowercased** address → display label (LSP3 name or short address)
 */
export function useIndexerDisplayNames(
  addresses: (string | null | undefined)[],
  options?: { enabled?: boolean }
): Record<string, string> {
  const enabled = options?.enabled !== false;
  const [map, setMap] = useState<Record<string, string>>({});

  const key = useMemo(() => {
    return [
      ...new Set(
        addresses
          .filter((a): a is string => Boolean(a && a.trim()))
          .map((a) => a.trim().toLowerCase())
      ),
    ]
      .sort()
      .join(",");
  }, [addresses]);

  useEffect(() => {
    if (!enabled || !key) {
      setMap({});
      return;
    }
    const list = key.split(",").filter(Boolean);
    let cancelled = false;
    fetchLuksoProfilesFromIndexer(list).then((profiles: Record<string, IndexerLeaderboardProfile | undefined>) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const addr of list) {
        const p = profiles[addr];
        const name = p?.name?.trim();
        next[addr] = name && name.length > 0 ? name : shortAddress(p?.address ?? addr);
      }
      setMap(next);
    });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return map;
}

/**
 * Batched LSP3 display names and profile images from the Hasura indexer (leaderboard / activity / sidebar).
 *
 * @example
 * const { labels, avatarUrls } = useIndexerLuksoFields([addrA, addrB]);
 * const labelA = labels[addrA.toLowerCase()];
 * const face = avatarUrls[addrA.toLowerCase()];
 */

import { useEffect, useMemo, useState } from "react";
import { fetchLuksoProfilesFromIndexer, type IndexerLeaderboardProfile } from "@/lib/lspIndexerProfiles";

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export interface IndexerLuksoFields {
  /** Lowercased address → LSP3 name or short hex */
  labels: Record<string, string>;
  /** Lowercased address → IPFS/HTTP profile image URL or null */
  avatarUrls: Record<string, string | null>;
}

/**
 * Single batch fetch: names + profile image URLs (same round-trip as names-only).
 * @returns Maps keyed by **lowercased** address
 */
export function useIndexerLuksoFields(
  addresses: (string | null | undefined)[],
  options?: { enabled?: boolean }
): IndexerLuksoFields {
  const enabled = options?.enabled !== false;
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});

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
      setLabels({});
      setAvatarUrls({});
      return;
    }
    const list = key.split(",").filter(Boolean);
    let cancelled = false;
    fetchLuksoProfilesFromIndexer(list).then((profiles: Record<string, IndexerLeaderboardProfile | undefined>) => {
      if (cancelled) return;
      const nextLabels: Record<string, string> = {};
      const nextAvatars: Record<string, string | null> = {};
      for (const addr of list) {
        const p = profiles[addr];
        const name = p?.name?.trim();
        nextLabels[addr] = name && name.length > 0 ? name : shortAddress(p?.address ?? addr);
        const a = p?.avatarUrl?.trim();
        nextAvatars[addr] = a && a.length > 0 ? a : null;
      }
      setLabels(nextLabels);
      setAvatarUrls(nextAvatars);
    });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return { labels, avatarUrls };
}

/**
 * @returns Map of **lowercased** address → display label (LSP3 name or short address)
 */
export function useIndexerDisplayNames(
  addresses: (string | null | undefined)[],
  options?: { enabled?: boolean }
): Record<string, string> {
  return useIndexerLuksoFields(addresses, options).labels;
}

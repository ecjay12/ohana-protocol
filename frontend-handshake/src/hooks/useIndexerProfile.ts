import { useEffect, useRef, useState } from "react";
import {
  fetchLuksoProfilesFromIndexer,
  type IndexerLeaderboardProfile,
} from "@/lib/lspIndexerProfiles";

/**
 * Fetches a single Universal Profile row from the LSP Hasura indexer (LUKSO).
 */
export function useIndexerProfile(address: string | null | undefined) {
  const [data, setData] = useState<IndexerLeaderboardProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const trimmed = address?.trim();
    if (!trimmed) {
      setData(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    const s = ++seq.current;
    setLoading(true);
    fetchLuksoProfilesFromIndexer([trimmed], { signal: ac.signal })
      .then((map) => {
        if (seq.current !== s) return;
        setData(map[trimmed.toLowerCase()] ?? null);
      })
      .catch(() => {
        if (seq.current === s) setData(null);
      })
      .finally(() => {
        if (seq.current === s) setLoading(false);
      });
    return () => ac.abort();
  }, [address]);

  return { data, loading };
}

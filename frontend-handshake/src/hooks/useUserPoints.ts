/**
 * Fetches aggregated Ohana Points from GET /api/profile-index (indexer + Prisma).
 */
import { useState, useEffect, useMemo, useCallback } from "react";

export interface ProfilePointsPayload {
  up: string;
  linkedEOAs: string[];
  pendingPoints: string;
  pointsBreakdown: Record<string, number>;
  totalPointsEver: string;
  lastClaimedBlock: string;
  lastClaimTxHash: string | null;
  indexed: boolean;
  message?: string;
}

function apiBase(): string {
  const env = import.meta.env.VITE_PUBLIC_API_URL as string | undefined;
  if (env && env.length > 0) return env.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export function useUserPoints(upAddress: string | null, chainId: number) {
  const [data, setData] = useState<ProfilePointsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const url = useMemo(() => {
    if (!upAddress?.trim()) return null;
    const base = apiBase();
    const q = new URLSearchParams({
      up: upAddress.trim(),
      chainId: String(chainId),
    });
    return `${base}/api/profile-index?${q.toString()}`;
  }, [upAddress, chainId]);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: ProfilePointsPayload) => {
        if (!cancelled) setData(j);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load points");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, refetchKey]);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  return { data, loading, error, refetch };
}

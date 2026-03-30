import { useState, useEffect } from "react";
import { fetchGlobalVouchGraph, type GlobalVouchGraphPayload } from "@/lib/globalVouchGraph";

export function useGlobalVouchGraph(chainId: number | undefined) {
  const [data, setData] = useState<GlobalVouchGraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chainId == null || Number.isNaN(chainId)) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGlobalVouchGraph(chainId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load graph");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chainId]);

  return { data, loading, error };
}

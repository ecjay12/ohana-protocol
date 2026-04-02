import { useState, useEffect } from "react";
import { fetchGlobalVouchGraph, type GlobalVouchGraphPayload } from "@/lib/globalVouchGraph";

/**
 * Loads the global vouch graph from LUKSO mainnet Handshake in the browser (no server).
 */
export function useGlobalVouchGraph() {
  const [data, setData] = useState<GlobalVouchGraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGlobalVouchGraph({ signal: ac.signal })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load graph";
        if (msg === "Aborted") return;
        setError(msg);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  return { data, loading, error };
}

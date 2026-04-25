import { useEffect, useState } from "react";
import { fetchHandshakeDappActivity, type LuksoActivityItem } from "@/lib/lspIndexerActivity";

export function useLuksoActivityFeed() {
  const [items, setItems] = useState<LuksoActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetchHandshakeDappActivity({ signal: ac.signal, maxItems: 24 })
      .then((data) => {
        if (!ac.signal.aborted) setItems(data);
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        if (!ac.signal.aborted) {
          setError("Couldn’t load activity");
          setItems([]);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return { items, loading, error };
}

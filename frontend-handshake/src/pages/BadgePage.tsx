/**
 * Embeddable badge page: "Vouched by N on Ohana".
 * Query params: address, chainId. No nav; minimal layout for iframe embedding.
 */

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getHandshakeAddress } from "@/config/contracts";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

const HANDSHAKE_ABI = HandshakeArtifact?.abi ?? [];

function parseChainId(chainIdParam: string | null): number {
  if (!chainIdParam) return 4201;
  const n = parseInt(chainIdParam, 10);
  if (Number.isNaN(n) || !(n in CHAINS)) return 4201;
  return n;
}

export function BadgePage() {
  const [searchParams] = useSearchParams();
  const addressParam = searchParams.get("address") ?? "";
  const chainId = parseChainId(searchParams.get("chainId"));

  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const addr = addressParam.trim();
    if (!addr) {
      setCount(null);
      setError("Missing address");
      setLoading(false);
      return;
    }
    let normalized: string;
    try {
      normalized = getAddress(addr);
    } catch {
      setCount(null);
      setError("Invalid address");
      setLoading(false);
      return;
    }
    const handshakeAddress = getHandshakeAddress(chainId);
    if (!handshakeAddress) {
      setCount(null);
      setError("Unsupported chain");
      setLoading(false);
      return;
    }
    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!rpc) {
      setCount(null);
      setError("Unsupported chain");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const provider = new JsonRpcProvider(rpc);
    const contract = new Contract(handshakeAddress, HANDSHAKE_ABI, provider);
    contract
      .acceptedCount(normalized)
      .then((c: bigint) => {
        if (!cancelled) setCount(Number(c));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addressParam, chainId]);

  const profilePath = addressParam.trim() ? `/profile/${encodeURIComponent(addressParam.trim())}` : "/";

  return (
    <div className="min-h-screen bg-theme-bg p-4">
      <div className="inline-flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-theme-text">
        {loading && <span className="text-sm text-theme-text-muted">Loading…</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
        {!loading && !error && count !== null && (
          <>
            <span className="text-sm">
              Vouched by <strong>{count}</strong> on Ohana
            </span>
            <Link
              to={profilePath}
              className="text-sm font-medium text-theme-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

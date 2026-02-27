/**
 * Embeddable widget: vouches received (accepted) and vouches given.
 * Query params: address, chainId. Minimal layout for iframe embedding.
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

export function EmbedPage() {
  const [searchParams] = useSearchParams();
  const addressParam = searchParams.get("address") ?? "";
  const chainId = parseChainId(searchParams.get("chainId"));

  const [received, setReceived] = useState<number | null>(null);
  const [given, setGiven] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const addr = addressParam.trim();
    if (!addr) {
      setReceived(null);
      setGiven(null);
      setError("Missing address");
      setLoading(false);
      return;
    }
    let normalized: string;
    try {
      normalized = getAddress(addr);
    } catch {
      setReceived(null);
      setGiven(null);
      setError("Invalid address");
      setLoading(false);
      return;
    }
    const handshakeAddress = getHandshakeAddress(chainId);
    if (!handshakeAddress) {
      setReceived(null);
      setGiven(null);
      setError("Unsupported chain");
      setLoading(false);
      return;
    }
    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!rpc) {
      setReceived(null);
      setGiven(null);
      setError("Unsupported chain");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const provider = new JsonRpcProvider(rpc);
    const contract = new Contract(handshakeAddress, HANDSHAKE_ABI, provider);
    Promise.all([
      contract.acceptedCount(normalized) as Promise<bigint>,
      contract.getTargetsVouchedBy(normalized) as Promise<string[]>,
    ])
      .then(([accepted, targets]) => {
        if (cancelled) return;
        setReceived(Number(accepted));
        setGiven(targets.length);
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

  const profilePath = addressParam.trim()
    ? `/profile/${encodeURIComponent(addressParam.trim())}`
    : "/";

  return (
    <div className="min-h-screen bg-theme-bg p-4 flex items-center justify-center">
      <div className="inline-flex flex-col gap-2 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-theme-text min-w-[200px]">
        {loading && (
          <span className="text-sm text-theme-text-muted">Loading…</span>
        )}
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
        {!loading && !error && received !== null && given !== null && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <span>
                <strong>{received}</strong> received
              </span>
              <span className="text-theme-text-muted">·</span>
              <span>
                <strong>{given}</strong> given
              </span>
            </div>
            <Link
              to={profilePath}
              className="text-xs font-medium text-theme-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View full profile on Ohana
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

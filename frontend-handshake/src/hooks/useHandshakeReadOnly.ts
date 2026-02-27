/**
 * Read-only Handshake data via JsonRpcProvider (for embed/miniapp when host passes address).
 */
import { useState, useEffect, useCallback } from "react";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getHandshakeAddress } from "@/config/contracts";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

const ABI = HandshakeArtifact?.abi ?? [];

export function useHandshakeReadOnly(chainId: number, address: string | null) {
  const [acceptedCount, setAcceptedCount] = useState<number>(0);
  const [incomingPending, setIncomingPending] = useState<{ voucher: string; category: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!address) {
      setAcceptedCount(0);
      setIncomingPending([]);
      return;
    }
    let normalized: string;
    try {
      normalized = getAddress(address.trim());
    } catch {
      setError("Invalid address");
      return;
    }
    const contractAddress = getHandshakeAddress(chainId);
    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!contractAddress || !rpc) {
      setError("Unsupported chain");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new JsonRpcProvider(rpc);
      const contract = new Contract(contractAddress, ABI, provider);
      const count = await contract.acceptedCount(normalized);
      setAcceptedCount(Number(count));
      const vouchers = await contract.getVouchersFor(normalized);
      const pending: { voucher: string; category: number }[] = [];
      for (const v of vouchers) {
        const vouch = await contract.getVouch(normalized, v);
        if (Number(vouch.status) === 1) pending.push({ voucher: v, category: Number(vouch.category) });
      }
      setIncomingPending(pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [chainId, address]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { acceptedCount, incomingPending, loading, error, refetch };
}

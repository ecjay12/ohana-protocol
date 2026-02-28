/**
 * Read-only Handshake data for profile owner (received count, given count).
 */
import { useState, useEffect, useCallback } from "react";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getHandshakeAddress } from "@/config/contracts";
// @ts-expect-error - JSON artifact
import HandshakeArtifact from "@contracts";

const ABI = HandshakeArtifact?.abi ?? [];

export function useHandshakeReadOnly(chainId: number, profileAddress: string | null) {
  const [received, setReceived] = useState<number>(0);
  const [given, setGiven] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!profileAddress) {
      setReceived(0);
      setGiven(0);
      return;
    }
    let normalized: string;
    try {
      normalized = getAddress(profileAddress.trim());
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
      const [accepted, targets] = await Promise.all([
        contract.acceptedCount(normalized) as Promise<bigint>,
        contract.getTargetsVouchedBy(normalized) as Promise<string[]>,
      ]);
      setReceived(Number(accepted));
      setGiven(targets.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [chainId, profileAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { received, given, loading, error, refetch };
}

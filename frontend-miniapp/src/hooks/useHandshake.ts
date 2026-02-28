/**
 * Handshake contract hook — vouch, removeVouch, and read operations for miniapp.
 */
import { useCallback, useState, useEffect, useMemo } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, getAddress } from "ethers";
// @ts-expect-error - JSON artifact
import HandshakeArtifact from "@contracts";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";

function getRevertReason(e: unknown): string {
  if (e instanceof Error) {
    const err = e as Error & { reason?: string; shortMessage?: string };
    const raw = err.reason || err.shortMessage || err.message || "Transaction failed";
    return toFriendlyError(raw);
  }
  return "Something went wrong. Please try again.";
}

function toFriendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("vouch exists")) return "You've already vouched for this profile.";
  if (lower.includes("cannot vouch for self")) return "You can't vouch for yourself.";
  if (lower.includes("invalid target") || lower.includes("invalid address")) return "Please enter a valid address.";
  if (lower.includes("insufficient fee")) return "Please add enough to cover the vouch fee.";
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Transaction was cancelled.";
  return raw.length > 80 ? "Transaction failed. Please try again." : raw;
}

export const CATEGORIES = [
  { value: 0, label: "Agent/Bot" },
  { value: 1, label: "Human" },
] as const;

export type VouchStatus = 0 | 1 | 2 | 3;

export function useHandshake(provider: BrowserProvider | null, chainId: number, account: string | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [fee, setFee] = useState<bigint>(0n);

  const address = getHandshakeAddress(chainId);
  const isSupported = !!address;

  const readOnlyContract = useMemo(() => {
    if (!address) return null;
    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!rpc) return null;
    return new Contract(address, HandshakeArtifact.abi, new JsonRpcProvider(rpc));
  }, [address, chainId]);

  useEffect(() => {
    if (!provider || !address) {
      setContract(null);
      return;
    }
    setContract(new Contract(address, HandshakeArtifact.abi, provider));
  }, [provider, address]);

  useEffect(() => {
    const c = contract ?? readOnlyContract;
    if (!c) {
      setFee(0n);
      return;
    }
    c.fee().then(setFee).catch(() => setFee(0n));
  }, [contract, readOnlyContract]);

  const getSignerContract = useCallback(async () => {
    if (!provider || !address || !account) return null;
    const signer = await provider.getSigner();
    return new Contract(address, HandshakeArtifact.abi, signer);
  }, [provider, address, account]);

  const vouch = useCallback(
    async (target: string, category: number) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedTarget = getAddress(target.trim());
        if (normalizedTarget.toLowerCase() === account?.toLowerCase()) {
          setError("Cannot vouch for yourself");
          setTxPending(false);
          return;
        }
        const tx = await c.vouch(normalizedTarget, category, { value: fee });
        await tx.wait();
        setError(null);
      } catch (e: unknown) {
        setError(getRevertReason(e));
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [getSignerContract, fee, account]
  );

  const removeVouch = useCallback(
    async (target: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedTarget = getAddress(target.trim());
        const tx = await c.removeVouch(normalizedTarget);
        await tx.wait();
        setError(null);
      } catch (e: unknown) {
        setError(getRevertReason(e));
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [getSignerContract]
  );

  const getVouch = useCallback(
    async (target: string, voucher: string): Promise<{ status: number } | null> => {
      const c = contract ?? readOnlyContract;
      if (!c) return null;
      try {
        const normalizedTarget = getAddress(target.trim());
        const normalizedVoucher = getAddress(voucher.trim());
        const v = await c.getVouch(normalizedTarget, normalizedVoucher);
        return { status: Number(v.status) };
      } catch {
        return null;
      }
    },
    [contract, readOnlyContract]
  );

  return {
    contract,
    error,
    txPending,
    fee,
    isSupported,
    vouch,
    removeVouch,
    getVouch,
  };
}

/**
 * Handshake contract hook — vouch, removeVouch, and read operations for miniapp.
 */
import { useCallback, useState, useEffect, useMemo } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, getAddress } from "ethers";
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
  if (lower.includes("not pending")) return "This vouch is no longer pending.";
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
    // Prefer readOnlyContract for fee: UP Provider returns raw RPC format that ethers can't parse
    const c = readOnlyContract ?? contract;
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
        // Read fee from readOnlyContract (JsonRpcProvider): UP Provider returns raw RPC format ethers can't parse
        const feeContract = readOnlyContract ?? c;
        let currentFee: bigint;
        try {
          currentFee = await feeContract.fee();
        } catch {
          currentFee = fee;
        }
        const tx = await c.vouch(normalizedTarget, category, { value: currentFee });
        await tx.wait();
        setError(null);
      } catch (e: unknown) {
        setError(getRevertReason(e));
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [getSignerContract, readOnlyContract, fee, account, chainId, address]
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

  const getIncomingPending = useCallback(
    async (target: string): Promise<{ voucher: string; category: number }[]> => {
      const c = readOnlyContract ?? contract;
      if (!c) return [];
      try {
        const list = await c.getVouchersFor(target);
        const out: { voucher: string; category: number }[] = [];
        for (const voucher of Array.isArray(list) ? list : []) {
          try {
            const v = await c.getVouch(target, voucher);
            if (Number(v.status) === 1) out.push({ voucher, category: Number(v.category) });
          } catch {
            /* skip */
          }
        }
        return out;
      } catch {
        return [];
      }
    },
    [contract, readOnlyContract]
  );

  const acceptVouch = useCallback(
    async (voucher: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const tx = await c.acceptVouch(getAddress(voucher.trim()));
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

  const denyVouch = useCallback(
    async (voucher: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const tx = await c.denyVouch(getAddress(voucher.trim()));
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

  return {
    contract,
    error,
    txPending,
    fee,
    isSupported,
    vouch,
    removeVouch,
    getVouch,
    getIncomingPending,
    acceptVouch,
    denyVouch,
  };
}

/**
 * Handshake contract hook — vouch, accept, deny, cancel, and read vouches.
 */
import { useCallback, useState, useEffect, useMemo } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, getAddress } from "ethers";
// @ts-expect-error - JSON artifact from repo root via Vite alias
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
  if (lower.includes("can only cancel pending")) return "You can only cancel pending vouches.";
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Transaction was cancelled.";
  return raw.length > 80 ? "Transaction failed. Please try again." : raw;
}

export const CATEGORIES = [
  { value: 0, label: "Agent/Bot" },
  { value: 1, label: "Human" },
] as const;

export type VouchStatus = 0 | 1 | 2 | 3;
export interface VouchData {
  status: VouchStatus;
  category: number;
  timestamp: bigint;
  updatedAt: bigint;
  hidden: boolean;
}

const STATUS_LABELS: Record<VouchStatus, string> = {
  0: "None",
  1: "Pending",
  2: "Accepted",
  3: "Denied",
};

export function useHandshake(provider: BrowserProvider | null, chainId: number, account: string | null) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [fee, setFee] = useState<bigint>(0n);

  const address = getHandshakeAddress(chainId);
  const isSupported = !!address;

  // Read-only contract (always available when chain is supported) for read operations
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
        let normalizedTarget: string;
        try {
          normalizedTarget = getAddress(target.trim());
        } catch {
          setError("Invalid address");
          setTxPending(false);
          return;
        }
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

  const acceptVouch = useCallback(
    async (voucher: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const tx = await c.acceptVouch(voucher);
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
        const tx = await c.denyVouch(voucher);
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

  const cancelVouch = useCallback(
    async (target: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const tx = await c.cancelVouch(target);
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
    async (target: string, voucher: string): Promise<VouchData | null> => {
      const c = contract ?? readOnlyContract;
      if (!c) return null;
      try {
        const normalizedTarget = getAddress(target.trim());
        const normalizedVoucher = getAddress(voucher.trim());
        const v = await c.getVouch(normalizedTarget, normalizedVoucher);
        return {
          status: Number(v.status) as VouchStatus,
          category: Number(v.category),
          timestamp: v.timestamp,
          updatedAt: v.updatedAt,
          hidden: Boolean(v.hidden),
        };
      } catch {
        return null;
      }
    },
    [contract, readOnlyContract]
  );

  const getVouchersFor = useCallback(
    async (target: string): Promise<string[]> => {
      const c = readOnlyContract ?? contract;
      if (!c) return [];
      try {
        const list = await c.getVouchersFor(target);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    [contract, readOnlyContract]
  );

  const getIncomingPendingForTarget = useCallback(
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
            // skip vouches that fail to load
          }
        }
        return out;
      } catch {
        return [];
      }
    },
    [contract, readOnlyContract]
  );

  const getIncomingPending = useCallback(async (): Promise<{ voucher: string; category: number }[]> => {
    if (!account) return [];
    return getIncomingPendingForTarget(account);
  }, [account, getIncomingPendingForTarget]);

  const getAcceptedCount = useCallback(
    async (target: string): Promise<number> => {
      const c = contract ?? readOnlyContract;
      if (!c) return 0;
      try {
        const normalizedTarget = getAddress(target.trim());
        const count = await c.acceptedCount(normalizedTarget);
        return Number(count);
      } catch {
        return 0;
      }
    },
    [contract, readOnlyContract]
  );

  const getTargetsVouchedBy = useCallback(
    async (voucher: string): Promise<string[]> => {
      const c = readOnlyContract ?? contract;
      if (!c) return [];
      try {
        const normalizedVoucher = getAddress(voucher.trim());
        const list = await c.getTargetsVouchedBy(normalizedVoucher);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    [contract, readOnlyContract]
  );

  const hideVouch = useCallback(
    async (voucher: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedVoucher = getAddress(voucher.trim());
        const tx = await c.hideVouch(normalizedVoucher);
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

  const unhideVouch = useCallback(
    async (voucher: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedVoucher = getAddress(voucher.trim());
        const tx = await c.unhideVouch(normalizedVoucher);
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

  /** Resolve linked UP for an EOA (OhanaHandshakeRegistry). Returns zero address if none. */
  const getUPForEOA = useCallback(
    async (eoa: string): Promise<string | null> => {
      const c = readOnlyContract ?? contract;
      if (!c || typeof c.getUPForEOA !== "function") return null;
      try {
        const up = await c.getUPForEOA(getAddress(eoa.trim()));
        return up && up !== "0x0000000000000000000000000000000000000000" ? up : null;
      } catch {
        return null;
      }
    },
    [contract, readOnlyContract]
  );

  /** Register EOA->UP binding (OhanaHandshakeRegistry only). No-op if contract lacks this function. */
  const registerEOAtoUP = useCallback(
    async (upAddress: string): Promise<boolean> => {
      const c = await getSignerContract();
      if (!c) return false;
      try {
        if (typeof c.registerEOAtoUP !== "function") return false;
        const tx = await c.registerEOAtoUP(getAddress(upAddress.trim()));
        await tx.wait();
        return true;
      } catch {
        return false;
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
    acceptVouch,
    denyVouch,
    cancelVouch,
    hideVouch,
    unhideVouch,
    removeVouch,
    getVouch,
    getVouchersFor,
    getTargetsVouchedBy,
    getIncomingPending,
    getIncomingPendingForTarget,
    getAcceptedCount,
    getUPForEOA,
    registerEOAtoUP,
    STATUS_LABELS,
  };
}

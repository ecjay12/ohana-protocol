/**
 * Handshake admin hook — reads Ownable/fee state on the connected chain and
 * exposes owner-only actions (withdrawFees, setFee, setFeeCollector).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, formatEther, getAddress, parseEther } from "ethers";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getRpcUrlForChain } from "@/lib/chainRpc";
import { getHandshakeAddress } from "@/config/contracts";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

export interface AdminState {
  owner: string | null;
  feeCollector: string | null;
  fee: bigint;
  accumulatedFees: bigint;
  contractBalance: bigint;
  ohanaPointsHub: string | null;
}

export interface UseHandshakeAdminResult {
  loading: boolean;
  error: string | null;
  txPending: boolean;
  txError: string | null;
  state: AdminState;
  handshakeAddress: string | null;
  isSupported: boolean;
  isOwner: boolean;
  canWithdraw: boolean;
  feeFormatted: string;
  accumulatedFeesFormatted: string;
  contractBalanceFormatted: string;
  refresh: () => Promise<void>;
  withdrawFees: () => Promise<boolean>;
  setFee: (amountEth: string) => Promise<boolean>;
  setFeeCollector: (newCollector: string) => Promise<boolean>;
}

const EMPTY_STATE: AdminState = {
  owner: null,
  feeCollector: null,
  fee: 0n,
  accumulatedFees: 0n,
  contractBalance: 0n,
  ohanaPointsHub: null,
};

function extractRevertText(e: unknown): string {
  if (e instanceof Error) {
    const err = e as Error & { reason?: string; shortMessage?: string };
    return err.reason || err.shortMessage || err.message;
  }
  return String(e ?? "Transaction failed");
}

export function useHandshakeAdmin(
  provider: BrowserProvider | null,
  chainId: number,
  account: string | null
): UseHandshakeAdminResult {
  const handshakeAddress = getHandshakeAddress(chainId);
  const rpc = getRpcUrlForChain(chainId) || null;
  const isSupported = Boolean(handshakeAddress && rpc);

  const [state, setState] = useState<AdminState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const reqIdRef = useRef(0);

  const readContract = useMemo(() => {
    if (!handshakeAddress || !rpc) return null;
    return new Contract(handshakeAddress, HandshakeArtifact.abi, createJsonRpcProvider(rpc));
  }, [handshakeAddress, rpc]);

  const refresh = useCallback(async () => {
    if (!readContract || !handshakeAddress || !rpc) {
      setState(EMPTY_STATE);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const provider = createJsonRpcProvider(rpc);
      const [owner, feeCollector, fee, accumulatedFees, contractBalance, ohanaPointsHub] =
        (await Promise.all([
          readContract.owner().catch(() => null),
          readContract.feeCollector().catch(() => null),
          readContract.fee().catch(() => 0n),
          readContract.accumulatedFees().catch(() => 0n),
          provider.getBalance(handshakeAddress).catch(() => 0n),
          readContract.ohanaPointsHub().catch(() => null),
        ])) as [unknown, unknown, unknown, unknown, unknown, unknown];
      if (id !== reqIdRef.current) return;
      const toBig = (v: unknown): bigint => {
        if (typeof v === "bigint") return v;
        if (v == null) return 0n;
        try {
          return BigInt(String(v));
        } catch {
          return 0n;
        }
      };
      setState({
        owner: owner ? String(owner) : null,
        feeCollector: feeCollector ? String(feeCollector) : null,
        fee: toBig(fee),
        accumulatedFees: toBig(accumulatedFees),
        contractBalance: toBig(contractBalance),
        ohanaPointsHub:
          ohanaPointsHub && String(ohanaPointsHub) !== "0x0000000000000000000000000000000000000000"
            ? String(ohanaPointsHub)
            : null,
      });
    } catch (e) {
      if (id !== reqIdRef.current) return;
      setError(extractRevertText(e));
      setState(EMPTY_STATE);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, [readContract, handshakeAddress, rpc]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwner = useMemo(() => {
    if (!account || !state.owner) return false;
    return account.toLowerCase() === state.owner.toLowerCase();
  }, [account, state.owner]);

  const canWithdraw = useMemo(() => {
    if (!account) return false;
    if (isOwner) return true;
    if (state.feeCollector && account.toLowerCase() === state.feeCollector.toLowerCase()) {
      return true;
    }
    return false;
  }, [account, isOwner, state.feeCollector]);

  const getSigner = useCallback(async () => {
    if (!provider || !handshakeAddress) return null;
    const signer = await provider.getSigner();
    return new Contract(handshakeAddress, HandshakeArtifact.abi, signer);
  }, [provider, handshakeAddress]);

  const withdrawFees = useCallback(async (): Promise<boolean> => {
    const c = await getSigner();
    if (!c) return false;
    setTxPending(true);
    setTxError(null);
    try {
      const tx = await c.withdrawFees();
      await tx.wait();
      await refresh();
      return true;
    } catch (e) {
      setTxError(extractRevertText(e));
      return false;
    } finally {
      setTxPending(false);
    }
  }, [getSigner, refresh]);

  const setFee = useCallback(
    async (amountEth: string): Promise<boolean> => {
      const c = await getSigner();
      if (!c) return false;
      setTxPending(true);
      setTxError(null);
      try {
        const amount = parseEther(amountEth.trim() || "0");
        const tx = await c.setFee(amount);
        await tx.wait();
        await refresh();
        return true;
      } catch (e) {
        setTxError(extractRevertText(e));
        return false;
      } finally {
        setTxPending(false);
      }
    },
    [getSigner, refresh]
  );

  const setFeeCollector = useCallback(
    async (newCollector: string): Promise<boolean> => {
      const c = await getSigner();
      if (!c) return false;
      setTxPending(true);
      setTxError(null);
      try {
        const normalized = getAddress(newCollector.trim());
        const tx = await c.setFeeCollector(normalized);
        await tx.wait();
        await refresh();
        return true;
      } catch (e) {
        setTxError(extractRevertText(e));
        return false;
      } finally {
        setTxPending(false);
      }
    },
    [getSigner, refresh]
  );

  return {
    loading,
    error,
    txPending,
    txError,
    state,
    handshakeAddress,
    isSupported,
    isOwner,
    canWithdraw,
    feeFormatted: formatEther(state.fee),
    accumulatedFeesFormatted: formatEther(state.accumulatedFees),
    contractBalanceFormatted: formatEther(state.contractBalance),
    refresh,
    withdrawFees,
    setFee,
    setFeeCollector,
  };
}

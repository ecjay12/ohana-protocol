/**
 * Handshake contract hook — vouch, removeVouch, and read operations for miniapp.
 */
import { useCallback, useState, useEffect, useMemo } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, getAddress } from "ethers";
import HandshakeArtifact from "@contracts";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { agentDebugLog } from "@/lib/agentDebugLog";

const OPAQUE_REVERT_USER_MESSAGE =
  "[Handshake miniapp] No revert reason was returned (common on UP mobile). Check: LUKSO mainnet vs testnet matches this profile, you have enough LYX for the vouch fee plus gas, and you have not already vouched. If you see this text (not raw “missing revert data”), the latest miniapp is loaded.";

function jsonSnippetForMatching(e: unknown): string {
  try {
    const s = JSON.stringify(e, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    return s.length > 1800 ? s.slice(0, 1800) : s;
  } catch {
    return "";
  }
}

function extractRevertText(e: unknown): string {
  if (e instanceof Error) {
    const err = e as Error & {
      code?: string | number;
      reason?: string;
      shortMessage?: string;
      data?: string;
      info?: { error?: { message?: string; data?: string }; reason?: string };
    };
    const codeStr = err.code != null ? String(err.code) : "";
    const nested =
      err.info && typeof err.info === "object" && err.info.error?.message
        ? String(err.info.error.message)
        : "";
    const dataStr =
      err.info && typeof err.info === "object" && err.info.error?.data
        ? String(err.info.error.data)
        : err.data
          ? String(err.data)
          : "";
    return [codeStr, err.reason, nested, dataStr, err.shortMessage, err.message].filter(Boolean).join(" ");
  }
  if (e && typeof e === "object" && "message" in (e as object)) {
    return String((e as { message: unknown }).message);
  }
  return String(e ?? "");
}

/** Concatenate every string we can get from an thrown value (wallet + ethers vary a lot on mobile). */
function combinedErrorText(e: unknown): string {
  const parts = [extractRevertText(e), jsonSnippetForMatching(e)].filter(Boolean);
  return parts.join(" ").trim() || "Transaction failed";
}

/** True when the RPC/wallet didn’t return Solidity revert data (typical UP mobile + ethers). */
function isLikelyOpaqueWalletRevert(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (lower.includes("revert data missing")) return true;
  if (lower.includes("missing revert data")) return true;
  if (lower.includes("missing revert data in transaction")) return true;
  if (lower.includes("missing revert")) return true;
  if (lower.includes("missing response")) return true;
  if (lower.includes("no revert data")) return true;
  if (lower.includes("could not coalesce error")) return true;
  if (lower.includes("transaction reverted without a reason")) return true;
  if (lower.includes("execution reverted") && lower.includes("unknown custom error")) return true;
  if (
    lower.includes("missing") &&
    lower.includes("revert") &&
    (lower.includes("data") || lower.includes("reason"))
  ) {
    return true;
  }
  return false;
}

/** Prefer wallet-reported chain for LUKSO (fixes UP app when `chainId` prop is briefly wrong vs actual network). */
async function resolveLuksoExecutionChainId(
  provider: BrowserProvider | null,
  fallBack: number
): Promise<number> {
  try {
    if (provider) {
      const nid = Number((await provider.getNetwork()).chainId);
      if (nid === 42 || nid === 4201) return nid;
    }
  } catch {
    /* ignore */
  }
  return fallBack;
}

/** Public RPC eth_call failed without a revert reason (common on mobile) — don’t block the real wallet tx. */
function isOpaqueSimulationFailure(extracted: string): boolean {
  if (isLikelyOpaqueWalletRevert(extracted)) return true;
  const t = extracted.toLowerCase();
  if (t.includes("could not coalesce error")) return true;
  return t.trim().length === 0;
}

function getRevertReason(e: unknown): string {
  const raw = combinedErrorText(e);
  const friendly = toFriendlyError(raw);
  if (isLikelyOpaqueWalletRevert(raw) || isLikelyOpaqueWalletRevert(friendly)) {
    return OPAQUE_REVERT_USER_MESSAGE;
  }
  return friendly;
}

/** Map any user-visible Handshake / wallet error to a friendly line (opaque RPC → branded copy). */
export function userFacingHandshakeError(message: string | null | undefined): string | null {
  if (message == null || message === "") return null;
  if (isLikelyOpaqueWalletRevert(message)) return OPAQUE_REVERT_USER_MESSAGE;
  return message;
}

function toFriendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (isLikelyOpaqueWalletRevert(raw)) {
    return OPAQUE_REVERT_USER_MESSAGE;
  }
  if (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("-32016")
  ) {
    return "The network is busy. Wait a moment and try again.";
  }
  if (lower.includes("insufficient funds")) {
    return "Not enough LYX to cover the vouch fee plus gas.";
  }
  if (lower.includes("vouch exists")) return "You've already vouched for this profile.";
  if (lower.includes("cannot vouch for self")) return "You can't vouch for yourself.";
  if (lower.includes("invalid target") || lower.includes("invalid address")) return "Please enter a valid address.";
  if (lower.includes("insufficient fee")) return "Please add enough to cover the vouch fee.";
  if (lower.includes("not pending")) return "This vouch is no longer pending.";
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Transaction was cancelled.";
  if (lower.includes("execution reverted") || lower.includes("call exception")) {
    return "The transaction was rejected on-chain. Check that you’re on LUKSO (mainnet or testnet to match this profile) and have enough LYX.";
  }
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
      if (!provider || !account) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedTarget = getAddress(target.trim());
        if (normalizedTarget.toLowerCase() === account?.toLowerCase()) {
          setError("Cannot vouch for yourself");
          setTxPending(false);
          return;
        }

        const executionChainId = await resolveLuksoExecutionChainId(provider, chainId);
        const execAddr = getHandshakeAddress(executionChainId);
        if (!execAddr) {
          setError("Handshake isn’t available on this network.");
          setTxPending(false);
          return;
        }

        let signerFromProvider = account ?? "";
        try {
          signerFromProvider = await provider.getSigner().then((s) => s.getAddress());
        } catch {
          /* keep account */
        }
        // #region agent log
        agentDebugLog(
          "useHandshake.ts:vouch:entry",
          "vouch invoked",
          {
            chainIdProp: chainId,
            executionChainId,
            chainAligned: chainId === executionChainId,
            handshakeContract: execAddr,
            accountHook: account ?? null,
            signerAddress: signerFromProvider,
            signerMatchesHook:
              !!account && !!signerFromProvider && account.toLowerCase() === signerFromProvider.toLowerCase(),
            target: normalizedTarget,
            category,
            cachedFeeWei: fee.toString(),
          },
          "H1-H3-H5"
        );
        // #endregion

        const rpc = CHAINS[executionChainId as keyof typeof CHAINS]?.rpc;
        const readC = rpc
          ? new Contract(execAddr, HandshakeArtifact.abi, new JsonRpcProvider(rpc))
          : null;

        let currentFee: bigint;
        try {
          currentFee = readC ? await readC.fee() : fee;
        } catch {
          currentFee = fee;
        }
        if (currentFee === 0n && readC) {
          try {
            const signer = await provider.getSigner();
            const tmp = new Contract(execAddr, HandshakeArtifact.abi, signer);
            currentFee = await tmp.fee();
          } catch {
            /* keep 0 */
          }
        }
        // #region agent log
        agentDebugLog(
          "useHandshake.ts:vouch:fee",
          "fee resolved",
          {
            currentFeeWei: currentFee.toString(),
            feeZero: currentFee === 0n,
            source: readC ? "publicRpc" : "cached",
          },
          "H3"
        );
        // #endregion

        if (readC && account) {
          try {
            await readC.vouch.staticCall(normalizedTarget, category, { value: currentFee, from: account });
            // #region agent log
            agentDebugLog(
              "useHandshake.ts:vouch:staticOk",
              "staticCall simulation ok",
              { from: account, chain: executionChainId },
              "H4"
            );
            // #endregion
          } catch (simErr) {
            const ext = combinedErrorText(simErr);
            // #region agent log
            agentDebugLog(
              "useHandshake.ts:vouch:staticFail",
              "staticCall simulation failed",
              { extract: ext, opaque: isOpaqueSimulationFailure(ext) },
              "H4"
            );
            // #endregion
            if (!isOpaqueSimulationFailure(ext)) {
              setError(toFriendlyError(ext) || "This wouldn’t go through. Check your balance and network.");
              setTxPending(false);
              return;
            }
            // #region agent log
            agentDebugLog(
              "useHandshake.ts:vouch:staticOpaque",
              "opaque simulation failure — continuing to wallet tx",
              {},
              "H4"
            );
            // #endregion
          }
        } else {
          // #region agent log
          agentDebugLog(
            "useHandshake.ts:vouch:staticSkip",
            "staticCall skipped",
            { hasReadC: !!readC, hasAccount: !!account },
            "H4-H5"
          );
          // #endregion
        }

        const signer = await provider.getSigner();
        const cExec = new Contract(execAddr, HandshakeArtifact.abi, signer);

        // #region agent log
        agentDebugLog("useHandshake.ts:vouch:send", "sending vouch tx", { gasLimit: "450000", executionChainId }, "H1-H5");
        // #endregion
        const tx = await cExec.vouch(normalizedTarget, category, { value: currentFee, gasLimit: 450000n });
        await tx.wait();
        // #region agent log
        agentDebugLog("useHandshake.ts:vouch:success", "vouch tx mined", { hash: tx.hash }, "H1-H5");
        // #endregion
        setError(null);
      } catch (e: unknown) {
        // #region agent log
        agentDebugLog(
          "useHandshake.ts:vouch:error",
          "vouch failed",
          {
            combined: combinedErrorText(e),
            extract: extractRevertText(e),
            friendly: getRevertReason(e),
            friendlyStillRaw: getRevertReason(e).toLowerCase().includes("missing revert"),
          },
          "H1-H5"
        );
        // #endregion
        setError(getRevertReason(e));
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [provider, fee, account, chainId]
  );

  const removeVouch = useCallback(
    async (target: string) => {
      const c = await getSignerContract();
      if (!c) return;
      setTxPending(true);
      setError(null);
      try {
        const normalizedTarget = getAddress(target.trim());
        const tx = await c.removeVouch(normalizedTarget, { gasLimit: 350000n });
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
        const tx = await c.acceptVouch(getAddress(voucher.trim()), { gasLimit: 450000n });
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
        const tx = await c.denyVouch(getAddress(voucher.trim()), { gasLimit: 350000n });
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

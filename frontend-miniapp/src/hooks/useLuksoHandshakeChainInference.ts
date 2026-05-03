/**
 * Legacy LSP28 grids often omit `chainId` in the iframe URL. Hosts can also report the
 * wrong chainId (e.g. testnet while viewing a mainnet-only Universal Profile).
 *
 * We combine:
 * 1) bytecode at the profile address on LUKSO mainnet vs testnet (UP exists on one chain)
 * 2) Handshake vouch activity on each chain
 *
 * Optional `?debug=1` surfaces the last inference in the UI.
 */
import { useState, useEffect } from "react";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getHandshakeAddress } from "@/config/contracts";
import HandshakeArtifact from "@contracts";

const ABI = HandshakeArtifact?.abi ?? [];

export type LuksoInferenceDebug = {
  deployHint: 42 | 4201 | null;
  /** Non-zero length bytecode on chain */
  hasCode42: boolean;
  hasCode4201: boolean;
  handshake42: number;
  handshake4201: number;
  picked: 42 | 4201;
  upChainIdReported: number;
};

async function luksoDeployHint(normalizedAddress: string): Promise<{
  hint: 42 | 4201 | null;
  hasCode42: boolean;
  hasCode4201: boolean;
}> {
  const rpc42 = CHAINS[42]?.rpc;
  const rpcT = CHAINS[4201]?.rpc;
  if (!rpc42 || !rpcT) {
    return { hint: null, hasCode42: false, hasCode4201: false };
  }
  const p42 = new JsonRpcProvider(rpc42);
  const pT = new JsonRpcProvider(rpcT);
  const [c42, cT] = await Promise.all([p42.getCode(normalizedAddress), pT.getCode(normalizedAddress)]);
  const hasCode42 = c42 !== "0x" && c42.length > 2;
  const hasCode4201 = cT !== "0x" && cT.length > 2;
  if (hasCode42 && !hasCode4201) return { hint: 42, hasCode42, hasCode4201 };
  if (hasCode4201 && !hasCode42) return { hint: 4201, hasCode42, hasCode4201 };
  return { hint: null, hasCode42, hasCode4201 };
}

async function handshakeActivityScore(normalizedAddress: string, chainId: 42 | 4201): Promise<number> {
  const contractAddress = getHandshakeAddress(chainId);
  const rpc = CHAINS[chainId]?.rpc;
  if (!contractAddress || !rpc) return 0;
  try {
    const provider = new JsonRpcProvider(rpc);
    const contract = new Contract(contractAddress, ABI, provider);
    const [accepted, targets] = await Promise.all([
      contract.acceptedCount(normalizedAddress) as Promise<bigint>,
      contract.getTargetsVouchedBy(normalizedAddress) as Promise<string[]>,
    ]);
    return Number(accepted) + (Array.isArray(targets) ? targets.length : 0);
  } catch {
    return 0;
  }
}

/** Exported for tests — combines deploy hint + Handshake scores */
export function pickLuksoChain(deployHint: 42 | 4201 | null, s42: number, s4201: number): 42 | 4201 {
  if (s42 > 0 && s4201 === 0) return 42;
  if (s4201 > 0 && s42 === 0) return 4201;
  if (deployHint != null) return deployHint;
  if (s42 > 0 && s4201 > 0) return 42;
  return 42;
}

export function useLuksoHandshakeChainInference(
  profileAddress: string | null,
  urlHandshakeChainId: number | null,
  isInUPContext: boolean,
  upChainId: number,
  inIframe: boolean,
  injectedHandshakeChain: number | null
): { chainId: number; probing: boolean; inferenceDebug: LuksoInferenceDebug | null } {
  const [resolved, setResolved] = useState<42 | 4201 | null>(null);
  const [inferenceDebug, setInferenceDebug] = useState<LuksoInferenceDebug | null>(null);

  const shouldProbe =
    urlHandshakeChainId == null &&
    profileAddress != null &&
    profileAddress.trim() !== "" &&
    (inIframe || isInUPContext);

  /** While probing in UP/embed, avoid showing the host's wrong chainId (e.g. testnet for a mainnet profile). */
  const syncFallback =
    urlHandshakeChainId ??
    (shouldProbe && isInUPContext ? 42 : isInUPContext ? upChainId : injectedHandshakeChain ?? 4201);

  useEffect(() => {
    if (!shouldProbe) {
      setResolved(null);
      setInferenceDebug(null);
      return;
    }

    let cancelled = false;
    setResolved(null);
    setInferenceDebug(null);

    (async () => {
      let normalized: string;
      try {
        normalized = getAddress(profileAddress!.trim());
      } catch {
        return;
      }

      const hostReportedChain = upChainId;

      const [{ hint, hasCode42, hasCode4201 }, s42, s4201] = await Promise.all([
        luksoDeployHint(normalized),
        handshakeActivityScore(normalized, 42),
        handshakeActivityScore(normalized, 4201),
      ]);
      if (cancelled) return;

      const picked = pickLuksoChain(hint, s42, s4201);
      setResolved(picked);
      setInferenceDebug({
        deployHint: hint,
        hasCode42,
        hasCode4201,
        handshake42: s42,
        handshake4201: s4201,
        picked,
        upChainIdReported: hostReportedChain,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldProbe, profileAddress]);

  const chainId = urlHandshakeChainId ?? resolved ?? syncFallback;
  const probing = shouldProbe && resolved === null;

  return { chainId, probing, inferenceDebug };
}

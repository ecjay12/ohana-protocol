/**
 * Read-only checks for EOA→UP linking (OhanaHandshakeRegistry vs plain Handshake).
 */
import { Contract, ZeroAddress, getAddress } from "ethers";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";
// @ts-expect-error JSON artifact
import HandshakeArtifact from "@contracts";

export type HandshakeRegistryDiagnostics = {
  chainId: number;
  handshakeAddress: string | null;
  rpcUrl: string | null;
  /** True if eth_call to getUPForEOA succeeds (registry deployed at this address). */
  registryReadable: boolean;
  registryDetail: string;
  /** Current mapping for connected account, if readable. */
  linkedUPOnChain: string | null;
  /** Whether pasted UP has contract bytecode on this chain. */
  upIsContract: boolean | null;
  upChecked: string | null;
};

export async function runHandshakeRegistryDiagnostics(
  chainId: number,
  connectedAccount: string | null,
  pastedUpAddress: string | null
): Promise<HandshakeRegistryDiagnostics> {
  const handshakeAddress = getHandshakeAddress(chainId);
  const rpcUrl = CHAINS[chainId as keyof typeof CHAINS]?.rpc ?? null;

  const base: HandshakeRegistryDiagnostics = {
    chainId,
    handshakeAddress,
    rpcUrl,
    registryReadable: false,
    registryDetail: "",
    linkedUPOnChain: null,
    upIsContract: null,
    upChecked: null,
  };

  if (!handshakeAddress || !rpcUrl) {
    base.registryDetail = "No Handshake address or RPC for this chain in chainConfig.";
    return base;
  }

  const provider = createJsonRpcProvider(rpcUrl);
  const c = new Contract(handshakeAddress, HandshakeArtifact.abi, provider);

  if (typeof c.getUPForEOA !== "function") {
    base.registryDetail = "ABI has no getUPForEOA (unexpected).";
    return base;
  }

  try {
    await c.getUPForEOA.staticCall(ZeroAddress);
    base.registryReadable = true;
    base.registryDetail =
      "getUPForEOA responds — this deployment behaves like OhanaHandshakeRegistry (or compatible).";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    base.registryDetail =
      msg.includes("execution reverted") || msg.toLowerCase().includes("revert")
        ? `Registry view call reverted. The address in chainConfig is likely plain Handshake, not OhanaHandshakeRegistry. (${msg.slice(0, 200)})`
        : msg;
    return base;
  }

  if (connectedAccount) {
    try {
      const up = await c.getUPForEOA(getAddress(connectedAccount));
      const z = ZeroAddress;
      if (up && String(up).toLowerCase() !== String(z).toLowerCase()) {
        base.linkedUPOnChain = getAddress(String(up));
      }
    } catch (e: unknown) {
      base.registryDetail += ` Could not read link for account: ${e instanceof Error ? e.message : e}`;
    }
  }

  const trimmed = pastedUpAddress?.trim();
  if (trimmed) {
    try {
      const up = getAddress(trimmed);
      base.upChecked = up;
      const code = await provider.getCode(up);
      base.upIsContract = code !== "0x" && code.length > 2;
    } catch {
      base.upChecked = null;
      base.upIsContract = null;
    }
  }

  return base;
}

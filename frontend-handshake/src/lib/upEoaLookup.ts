/**
 * Resolve EOAs linked to a Universal Profile via EOARegistered events.
 * Used to aggregate vouches from MetaMask/EOA wallets onto UP profiles.
 *
 * Links are stored on LUKSO deployments of Handshake (registry). We merge
 * **LUKSO mainnet (42)** and **LUKSO Testnet (4201)** so registrations on either
 * network are discovered — then vouches are read per chain in useProfileVouches
 * (including Base) for the same 0x addresses.
 */

import { Contract, getAddress } from "ethers";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

const ABI = HandshakeArtifact?.abi ?? [];

/** Chains where EOA→UP bindings are indexed (UP as contract + registry). */
const EOA_REGISTRY_LUKSO_CHAINS = [42, 4201] as const;

async function fetchEOAsLinkedOnLuksoChain(
  normalizedUP: string,
  lookupChainId: number
): Promise<string[]> {
  const contractAddress = getHandshakeAddress(lookupChainId);
  const rpc = CHAINS[lookupChainId as keyof typeof CHAINS]?.rpc;
  if (!contractAddress || !rpc) return [];

  const provider = createJsonRpcProvider(rpc);
  const contract = new Contract(contractAddress, ABI, provider);

  try {
    const filter = contract.filters.EOARegistered(null, normalizedUP);
    const events = await contract.queryFilter(filter);

    const eoas = events
      .map((e) => {
        const args = "args" in e ? e.args : undefined;
        const eoa = args?.[0];
        return typeof eoa === "string" ? getAddress(eoa) : null;
      })
      .filter((a): a is string => a != null);

    const uniqueEoas = [...new Set(eoas)];

    const stillLinked: string[] = [];
    for (const eoa of uniqueEoas) {
      try {
        const currentUP = await contract.getUPForEOA(eoa);
        if (
          currentUP &&
          currentUP !== "0x0000000000000000000000000000000000000000" &&
          getAddress(currentUP) === normalizedUP
        ) {
          stillLinked.push(eoa);
        }
      } catch {
        stillLinked.push(eoa);
      }
    }

    return stillLinked;
  } catch {
    return [];
  }
}

/**
 * EOAs currently linked to this UP (merged from LUKSO + LUKSO testnet registry).
 * @param _chainId unused — kept for call-site compatibility; discovery is always LUKSO family.
 */
export async function getEOAsForUP(upAddress: string, _chainId: number): Promise<string[]> {
  const normalizedUP = getAddress(upAddress.trim());
  const byLower = new Map<string, string>();

  for (const lookupChainId of EOA_REGISTRY_LUKSO_CHAINS) {
    const part = await fetchEOAsLinkedOnLuksoChain(normalizedUP, lookupChainId);
    for (const eoa of part) {
      const k = eoa.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, eoa);
    }
  }

  return Array.from(byLower.values());
}

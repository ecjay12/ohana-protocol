/**
 * Resolve EOAs linked to a Universal Profile via EOARegistered events.
 * Used to aggregate vouches from MetaMask/EOA wallets onto UP profiles.
 */

import { Contract, getAddress } from "ethers";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

const ABI = HandshakeArtifact?.abi ?? [];

/** LUKSO chain IDs where UPs exist and registerEOAtoUP is called */
const LUKSO_CHAIN_IDS = [42, 4201] as const;

/**
 * Get EOAs currently linked to a Universal Profile by querying EOARegistered events.
 * Uses LUKSO chain for the lookup (UPs exist on LUKSO).
 * Filters by getUPForEOA to exclude EOAs that have since unregistered.
 */
export async function getEOAsForUP(
  upAddress: string,
  chainId: number
): Promise<string[]> {
  const normalizedUP = getAddress(upAddress.trim());

  // Use LUKSO chain for EOA lookup; UPs exist on LUKSO
  const lookupChainId = LUKSO_CHAIN_IDS.includes(chainId as (typeof LUKSO_CHAIN_IDS)[number])
    ? chainId
    : 4201; // default to LUKSO testnet

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

    // Dedupe (same EOA could re-register)
    const uniqueEoas = [...new Set(eoas)];

    // Filter out EOAs that have since unregistered
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
        // If getUPForEOA fails (e.g. old contract), include the EOA
        stillLinked.push(eoa);
      }
    }

    return stillLinked;
  } catch {
    return [];
  }
}

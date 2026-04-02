/**
 * Hardcoded chains for Universal Profile vouch aggregation (read-only).
 * EOA→UP is registered on LUKSO (registry); the same 0x EOA on Base is discovered via LUKSO
 * events and included when reading Base Handshake state.
 */
import { getHandshakeAddress } from "@/config/contracts";

/** Chains to scan when viewing a UP profile (must have Handshake + RPC in shared chainConfig). */
export const UP_PROFILE_AGGREGATION_CHAIN_IDS: readonly number[] = [
  42, // LUKSO mainnet
  4201, // LUKSO testnet
  8453, // Base mainnet
  84532, // Base Sepolia
] as const;

/** Chains that have a deployed Handshake contract (skips empty entries e.g. Ethereum mainnet). */
export function getAggregationChainsWithHandshake(): number[] {
  return UP_PROFILE_AGGREGATION_CHAIN_IDS.filter((id) => !!getHandshakeAddress(id));
}

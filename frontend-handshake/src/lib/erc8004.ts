/**
 * ERC-8004 Trustless Agents integration.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */

import { getERC8004IdentityAddress, getERC8004ReputationAddress } from "@/config/contracts";

/** Check if a chain has ERC-8004 registries configured. */
export function hasERC8004Support(chainId: number): boolean {
  return !!(
    getERC8004IdentityAddress(chainId) &&
    getERC8004ReputationAddress(chainId)
  );
}

/**
 * ERC-8004 Trustless Agents integration.
 * @see https://eips.ethereum.org/EIPS/eip-8004
 *
 * Identity Registry: agentId (ERC-721), agentURI → registration file.
 * Reputation Registry: feedback (value, tag1, tag2), revoke, responses.
 * Registration file can include x402Support and payment addresses (agentWallet).
 */

import { getERC8004IdentityAddress, getERC8004ReputationAddress } from "@/config/contracts";

/** Agent registration file (from agentURI). */
export interface ERC8004Registration {
  type: string;
  name: string;
  description?: string;
  image?: string;
  services?: Array<{
    name: string;
    endpoint: string;
    version?: string;
    skills?: string[];
    domains?: string[];
  }>;
  x402Support?: boolean;
  active?: boolean;
  registrations?: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
  supportedTrust?: string[];
}

/** Resolve agent registration JSON from agentURI (IPFS, HTTPS, or data URI). */
export async function fetchAgentRegistration(agentURI: string): Promise<ERC8004Registration | null> {
  try {
    let url: string;
    if (agentURI.startsWith("ipfs://")) {
      const cid = agentURI.slice(7).split("/")[0];
      url = `https://ipfs.io/ipfs/${cid}`;
    } else if (agentURI.startsWith("https://") || agentURI.startsWith("http://")) {
      url = agentURI;
    } else if (agentURI.startsWith("data:application/json;base64,")) {
      const b64 = agentURI.slice(29);
      const json = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(json) as ERC8004Registration;
    } else {
      return null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as ERC8004Registration;
  } catch {
    return null;
  }
}

/** Check if a chain has ERC-8004 registries configured. */
export function hasERC8004Support(chainId: number): boolean {
  return !!(
    getERC8004IdentityAddress(chainId) &&
    getERC8004ReputationAddress(chainId)
  );
}

/** Build agent registry identifier per EIP-8004: eip155:{chainId}:{identityRegistry}. */
export function agentRegistryId(chainId: number, identityRegistryAddress: string): string {
  return `eip155:${chainId}:${identityRegistryAddress}`;
}

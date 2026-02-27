/**
 * Local storage for ERC-8004 Agent ID by chainId + address.
 * Used so "Link my Agent ID" and target agentId resolution work.
 */

const KEY_PREFIX = "ohana_erc8004_agentId";

function storageKey(chainId: number, address: string): string {
  return `${KEY_PREFIX}_${chainId}_${address.toLowerCase()}`;
}

export function getStoredAgentId(chainId: number, address: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(chainId, address));
}

export function setStoredAgentId(chainId: number, address: string, agentId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(chainId, address), agentId);
}

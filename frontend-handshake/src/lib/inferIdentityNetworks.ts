import { getAddress } from "ethers";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { parseGivenVouchKey, parseReceivedVouchKey } from "@/lib/vouchAggregationKeys";

function chainLabel(chainId: number): string {
  const n = CHAINS[chainId as keyof typeof CHAINS]?.name;
  if (n) {
    if (chainId === 42 || chainId === 4201) return "LUKSO";
    if (chainId === 8453 || chainId === 84532) return "Base";
    return n;
  }
  return `Chain ${chainId}`;
}

/**
 * Best-effort network column for a Handshake identity from aggregated vouch keys.
 */
export function inferNetworkLabelForIdentity(
  identity: string,
  vouchersForTarget: string[],
  targetsVouchedBy: string[]
): string {
  let id: string;
  try {
    id = getAddress(identity).toLowerCase();
  } catch {
    return "—";
  }

  const chains = new Set<number>();

  for (const key of vouchersForTarget) {
    const p = parseReceivedVouchKey(key);
    if (p && p.target.toLowerCase() === id) chains.add(p.chainId);
  }
  for (const key of targetsVouchedBy) {
    const p = parseGivenVouchKey(key);
    if (p && p.voucher.toLowerCase() === id) chains.add(p.chainId);
  }

  if (chains.size === 0) return "—";
  const labels = [...chains]
    .sort((a, b) => a - b)
    .map(chainLabel);
  const uniq = [...new Set(labels)];
  return uniq.join(" · ");
}

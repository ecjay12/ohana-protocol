/**
 * Fetches profile names for multiple addresses (LSP3/LSP4).
 * Returns Record<address, label> — name or short address fallback.
 */

import { useState, useEffect, useMemo } from "react";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getProfileData } from "@/lib/lsp4Profile";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getRpcUrlForChain } from "@/lib/chainRpc";

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export interface ProfileNamesForAddressesOptions {
  /**
   * Ordered chain IDs to try for LSP profile resolution (first match wins).
   * Defaults to `[chainId]` only. Graph views should pass `getGraphProfileNameLookupChainIds(chainId)`
   * so UP names resolve on LUKSO when the wallet is on Base or another chain.
   */
  chainIdsForLookup?: number[];
}

/** Prefer current chain, then LUKSO testnet + mainnet so UP names match ego graph behavior. */
export function getGraphProfileNameLookupChainIds(chainId: number): number[] {
  const order = [chainId, 4201, 42];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of order) {
    if (!CHAINS[id as keyof typeof CHAINS]?.rpc) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function resolveLookupChainIds(
  chainId: number,
  options?: ProfileNamesForAddressesOptions
): number[] {
  if (options?.chainIdsForLookup?.length) {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const id of options.chainIdsForLookup) {
      if (!CHAINS[id as keyof typeof CHAINS]?.rpc) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out.length > 0 ? out : getGraphProfileNameLookupChainIds(chainId);
  }
  return CHAINS[chainId as keyof typeof CHAINS]?.rpc ? [chainId] : [];
}

export function useProfileNamesForAddresses(
  addresses: string[],
  chainId: number,
  options?: ProfileNamesForAddressesOptions
): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});

  const normalized = useMemo(() => {
    return addresses
      .filter((a) => a && a.trim())
      .map((a) => a.trim().toLowerCase());
  }, [addresses]);

  const lookupChainIds = useMemo(
    () => resolveLookupChainIds(chainId, options),
    [chainId, options?.chainIdsForLookup?.join(",") ?? ""]
  );

  const lookupKey = `${normalized.join(",")}|${lookupChainIds.join(",")}`;

  useEffect(() => {
    if (normalized.length === 0) {
      setNames({});
      return;
    }

    if (lookupChainIds.length === 0) {
      const fallback: Record<string, string> = {};
      normalized.forEach((a) => (fallback[a] = shortAddress(a)));
      setNames(fallback);
      return;
    }

    let cancelled = false;

    Promise.all(
      normalized.map(async (addr) => {
        for (const cid of lookupChainIds) {
          const rpc = getRpcUrlForChain(cid);
          if (!rpc) continue;
          const provider = createJsonRpcProvider(rpc);
          try {
            const data = await getProfileData(provider, addr);
            const name = data?.name?.trim();
            if (name) return { addr, label: name };
          } catch {
            /* try next chain */
          }
        }
        return { addr, label: shortAddress(addr) };
      })
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach(({ addr, label }) => (map[addr] = label));
      setNames(map);
    });

    return () => {
      cancelled = true;
    };
  }, [lookupKey]);

  return names;
}

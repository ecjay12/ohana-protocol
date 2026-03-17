/**
 * Fetches profile names for multiple addresses (LSP3/LSP4).
 * Returns Record<address, label> — name or short address fallback.
 */

import { useState, useEffect, useMemo } from "react";
import { JsonRpcProvider } from "ethers";
import { getProfileData } from "@/lib/lsp4Profile";
import { CHAINS } from "@/hooks/useInjectedWallet";

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useProfileNamesForAddresses(
  addresses: string[],
  chainId: number
): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});

  const normalized = useMemo(() => {
    return addresses
      .filter((a) => a && a.trim())
      .map((a) => a.trim().toLowerCase());
  }, [addresses]);

  useEffect(() => {
    if (normalized.length === 0) {
      setNames({});
      return;
    }

    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!rpc) {
      const fallback: Record<string, string> = {};
      normalized.forEach((a) => (fallback[a] = shortAddress(a)));
      setNames(fallback);
      return;
    }

    let cancelled = false;
    const provider = new JsonRpcProvider(rpc);

    Promise.all(
      normalized.map(async (addr) => {
        try {
          const data = await getProfileData(provider, addr);
          const name = data?.name?.trim();
          return { addr, label: name || shortAddress(addr) };
        } catch {
          return { addr, label: shortAddress(addr) };
        }
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
  }, [normalized.join(","), chainId]);

  return names;
}

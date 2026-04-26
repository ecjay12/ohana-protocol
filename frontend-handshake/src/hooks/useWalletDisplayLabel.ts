import { useMemo } from "react";
import { useIndexerDisplayNames } from "@/hooks/useIndexerDisplayNames";
import { isShortAddressLabel } from "@/lib/upDisplayLabel";

function truncateHex(a: string) {
  if (!a || a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * `shortAddress` for AppLayout: LUKSO indexer LSP3 name when available, else truncated hex.
 * Matches what the sidebar prefers when the parent passes a fallback string.
 */
export function useWalletDisplayLabel(address: string | null | undefined) {
  const trimmed = useMemo(
    () => (address && address.trim() ? address.trim() : null),
    [address]
  );
  const map = useIndexerDisplayNames(trimmed ? [trimmed] : [], { enabled: Boolean(trimmed) });
  return useMemo(() => {
    if (!trimmed) return "";
    const i = map[trimmed.toLowerCase()];
    if (i && !isShortAddressLabel(i)) return i;
    return i || truncateHex(trimmed);
  }, [trimmed, map]);
}

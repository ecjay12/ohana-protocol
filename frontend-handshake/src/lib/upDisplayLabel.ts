/**
 * Heuristic: `useIndexerDisplayNames` falls back to shortened `0x…` when the indexer has no LSP3 name.
 */
export function isShortAddressLabel(label: string): boolean {
  const s = label.trim();
  return s.startsWith("0x") && s.includes("…");
}

/**
 * For each address, prefer a non-truncated RPC/LSP3 label, then a non-truncated indexer label, then any label, then a short hex.
 */
export function mergeRpcAndIndexerLabels(
  indexer: Record<string, string>,
  rpc: Record<string, string>,
  addresses: string[]
): Record<string, string> {
  const shortHex = (a: string) => {
    if (!a || a.length < 10) return a;
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  };
  const out: Record<string, string> = {};
  for (const raw of addresses) {
    if (!raw?.trim()) continue;
    const a = raw.trim();
    const k = a.toLowerCase();
    const i = indexer[k];
    const r = rpc[k];
    const good = (x?: string) => (x && !isShortAddressLabel(x) ? x : null);
    out[k] = good(r) || good(i) || r || i || shortHex(a);
  }
  return out;
}

/** CSS: human LSP3 name vs hex fallback */
export function labelTextClass(label: string): string {
  return isShortAddressLabel(label) ? "font-mono text-sm text-theme-text" : "text-sm font-medium text-theme-text";
}

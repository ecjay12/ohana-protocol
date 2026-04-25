/**
 * Heuristic: `useIndexerDisplayNames` falls back to shortened `0x…` when the indexer has no LSP3 name.
 */
export function isShortAddressLabel(label: string): boolean {
  const s = label.trim();
  return s.startsWith("0x") && s.includes("…");
}

/** CSS: human LSP3 name vs hex fallback */
export function labelTextClass(label: string): string {
  return isShortAddressLabel(label) ? "font-mono text-sm text-theme-text" : "text-sm font-medium text-theme-text";
}

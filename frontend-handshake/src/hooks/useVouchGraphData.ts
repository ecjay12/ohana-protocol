/**
 * Builds graph data (nodes + edges) from vouch relationships for 3D visualization.
 * Nodes = unique addresses; edges = voucher -> target.
 */

export interface VouchGraphEdge {
  voucher: string;
  target: string;
  strength: number;
}

export interface VouchGraphData {
  nodes: string[];
  edges: VouchGraphEdge[];
  centerAddress: string | null;
}

export function useVouchGraphData(
  account: string | null,
  vouchersForTarget: string[],
  targetsVouchedBy: string[]
): VouchGraphData {
  if (!account) {
    return { nodes: [], edges: [], centerAddress: null };
  }

  const center = account.toLowerCase();
  const nodesSet = new Set<string>([center]);

  const edges: VouchGraphEdge[] = [];

  // Received: voucher -> account
  for (const voucher of vouchersForTarget) {
    const v = voucher.toLowerCase();
    nodesSet.add(v);
    edges.push({ voucher: v, target: center, strength: 1 });
  }

  // Given: account -> target
  for (const target of targetsVouchedBy) {
    const t = target.toLowerCase();
    nodesSet.add(t);
    edges.push({ voucher: center, target: t, strength: 1 });
  }

  const nodes = Array.from(nodesSet);
  return { nodes, edges, centerAddress: center };
}

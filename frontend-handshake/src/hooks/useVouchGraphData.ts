/**
 * Builds graph data (nodes + edges) from vouch relationships for 3D visualization.
 * Nodes = unique addresses; edges = voucher -> target.
 * Supports plain addresses and composite keys from UP aggregation (r:/g: prefixes).
 */

import {
  displayAddressFromReceivedKey,
  displayAddressFromGivenKey,
} from "@/lib/vouchAggregationKeys";

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
  for (const key of vouchersForTarget) {
    const v = displayAddressFromReceivedKey(key).toLowerCase();
    nodesSet.add(v);
    edges.push({ voucher: v, target: center, strength: 1 });
  }

  // Given: account -> target
  for (const key of targetsVouchedBy) {
    const t = displayAddressFromGivenKey(key).toLowerCase();
    nodesSet.add(t);
    edges.push({ voucher: center, target: t, strength: 1 });
  }

  const nodes = Array.from(nodesSet);
  return { nodes, edges, centerAddress: center };
}

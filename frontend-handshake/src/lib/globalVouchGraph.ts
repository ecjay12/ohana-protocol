/**
 * Global (network-wide) vouch graph payload for /vouch-graph.
 * API may return indexed edges; until then we ship a deterministic client stub.
 */
import type { VouchGraphData } from "@/hooks/useVouchGraphData";

export type GlobalVouchGraphSource = "api" | "stub";

export interface GlobalVouchGraphPayload extends VouchGraphData {
  centerAddress: null;
  source: GlobalVouchGraphSource;
  /** Human-readable note (e.g. stub disclaimer). */
  message?: string;
}

/** Downsampled sample graph for layout preview until an indexer is wired. */
export function getGlobalVouchGraphStub(chainId: number): GlobalVouchGraphPayload {
  const n1 = "0x1000000000000000000000000000000000000001";
  const n2 = "0x2000000000000000000000000000000000000002";
  const n3 = "0x3000000000000000000000000000000000000003";
  const n4 = "0x4000000000000000000000000000000000000004";
  const n5 = "0x5000000000000000000000000000000000000005";
  const nodes = [n1, n2, n3, n4, n5];
  const edges = [
    { voucher: n1, target: n2, strength: 1 },
    { voucher: n2, target: n3, strength: 1 },
    { voucher: n3, target: n4, strength: 1 },
    { voucher: n1, target: n4, strength: 1 },
    { voucher: n2, target: n5, strength: 1 },
  ];
  return {
    nodes,
    edges,
    centerAddress: null,
    source: "stub",
    message:
      chainId > 0
        ? "Sample subgraph — full network view will load from the indexer when available."
        : "Sample subgraph.",
  };
}

function isVouchGraphData(x: unknown): x is VouchGraphData {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o.nodes) &&
    Array.isArray(o.edges) &&
    (o.centerAddress === null || typeof o.centerAddress === "string")
  );
}

/** Normalize API JSON to global graph (no focal node). */
export function parseGlobalVouchGraphResponse(
  json: unknown,
  chainId: number
): GlobalVouchGraphPayload {
  if (!isVouchGraphData(json)) return getGlobalVouchGraphStub(chainId);
  const nodes = json.nodes.map((n) => String(n).toLowerCase());
  const edges = json.edges.map((e) => {
    const edge = e as { voucher?: string; target?: string; strength?: number };
    return {
      voucher: String(edge.voucher ?? "").toLowerCase(),
      target: String(edge.target ?? "").toLowerCase(),
      strength: typeof edge.strength === "number" ? edge.strength : 1,
    };
  });
  const j = json as unknown as Record<string, unknown>;
  const source: GlobalVouchGraphSource = j.source === "api" ? "api" : "stub";
  return {
    nodes,
    edges,
    centerAddress: null,
    source,
    message: typeof j.message === "string" ? j.message : undefined,
  };
}

export async function fetchGlobalVouchGraph(
  chainId: number
): Promise<GlobalVouchGraphPayload> {
  const q = new URLSearchParams({ chainId: String(chainId) });
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    const res = await fetch(`${base}/api/vouch-graph?${q}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const j: unknown = await res.json();
      return parseGlobalVouchGraphResponse(j, chainId);
    }
  } catch {
    /* use stub */
  }
  return getGlobalVouchGraphStub(chainId);
}

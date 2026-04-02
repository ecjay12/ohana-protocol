/**
 * Global vouch graph for /vouch-graph — loaded entirely from LUKSO mainnet Handshake in the browser (no server).
 */
import type { VouchGraphData } from "@/hooks/useVouchGraphData";
import { fetchLuksoHandshakeVouchGraph } from "@/lib/luksoHandshakeVouchGraph";

export type GlobalVouchGraphSource = "api" | "stub" | "lukso-rpc";

export interface GlobalVouchGraphPayload extends VouchGraphData {
  centerAddress: null;
  source: GlobalVouchGraphSource;
  message?: string;
  truncated?: boolean;
}

/** Sample layout (e.g. tests) — not used for the live social graph. */
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
    message: chainId > 0 ? "Sample subgraph (stub)." : "Sample subgraph.",
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

/** Normalize remote JSON (e.g. future indexer) to the graph shape. */
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
  const src = j.source;
  const source: GlobalVouchGraphSource =
    src === "api" || src === "lukso-rpc" ? src : "stub";
  return {
    nodes,
    edges,
    centerAddress: null,
    source,
    message: typeof j.message === "string" ? j.message : undefined,
    truncated: j.truncated === true,
  };
}

/** Social graph = LUKSO mainnet Handshake `VouchAccepted` logs only (UP ecosystem). */
export async function fetchGlobalVouchGraph(opts?: {
  signal?: AbortSignal;
  maxEdges?: number;
}): Promise<GlobalVouchGraphPayload> {
  return fetchLuksoHandshakeVouchGraph(opts);
}

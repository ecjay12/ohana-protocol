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

/** Social graph = LUKSO mainnet Handshake `VouchAccepted` logs only (UP ecosystem). */
export async function fetchGlobalVouchGraph(opts?: {
  signal?: AbortSignal;
  maxEdges?: number;
}): Promise<GlobalVouchGraphPayload> {
  return fetchLuksoHandshakeVouchGraph(opts);
}

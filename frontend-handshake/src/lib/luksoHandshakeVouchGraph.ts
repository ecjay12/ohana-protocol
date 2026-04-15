/**
 * Social / global vouch graph: scan LUKSO mainnet Handshake only (Universal Profiles).
 * Runs entirely in the browser — no /api server required.
 */
import { Interface, getAddress } from "ethers";
import chainConfig from "../../shared/chainConfig.json";
import { getHandshakeAddress } from "@/config/contracts";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import type { GlobalVouchGraphPayload } from "./globalVouchGraph";

/** Canonical chain for UP-centric social graph (Handshake on LUKSO mainnet). */
export const LUKSO_SOCIAL_GRAPH_CHAIN_ID = 42;

const HANDSHAKE_IFACE = new Interface([
  "event VouchAccepted(address indexed target, address indexed voucher)",
]);

const DEFAULT_CHUNK = 15_000n;
const GET_LOGS_INTER_CHUNK_MS = 50;
const RPC_MAX_RETRIES = 6;
const RPC_BASE_DELAY_MS = 350;
const DEFAULT_MAX_EDGES = 5_000;

type ChainEntry = { rpc?: string; vouchSyncFromBlock?: string };

function rpcForLukso(): string | null {
  const c = (chainConfig as { chains?: Record<string, ChainEntry> }).chains?.[
    String(LUKSO_SOCIAL_GRAPH_CHAIN_ID)
  ];
  const rpc = c?.rpc;
  return rpc && rpc.length > 0 ? rpc : null;
}

function startBlockLukso(): bigint {
  const c = (chainConfig as { chains?: Record<string, ChainEntry> }).chains?.[
    String(LUKSO_SOCIAL_GRAPH_CHAIN_ID)
  ];
  const raw = c?.vouchSyncFromBlock;
  if (raw && /^\d+$/.test(String(raw))) return BigInt(String(raw));
  return 0n;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("Aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRateLimitError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("exceeded")
  );
}

async function withRpcRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < RPC_MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new Error("Aborted");
    try {
      return await fn();
    } catch (e: unknown) {
      last = e;
      if (!isRateLimitError(e) || attempt === RPC_MAX_RETRIES - 1) throw e;
      const delay = RPC_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
      await sleep(delay, signal);
    }
  }
  throw last;
}

/**
 * Loads voucher → target edges from VouchAccepted logs on LUKSO mainnet Handshake.
 */
export async function fetchLuksoHandshakeVouchGraph(opts?: {
  signal?: AbortSignal;
  maxEdges?: number;
}): Promise<GlobalVouchGraphPayload> {
  const maxEdges = Math.max(
    50,
    Math.min(100_000, opts?.maxEdges ?? DEFAULT_MAX_EDGES)
  );

  const handshake = getHandshakeAddress(LUKSO_SOCIAL_GRAPH_CHAIN_ID);
  const rpc = rpcForLukso();
  if (!handshake || !rpc) {
    throw new Error("LUKSO Handshake or RPC missing in chainConfig.");
  }

  const provider = createJsonRpcProvider(rpc);
  const latest = BigInt(
    await withRpcRetry(() => provider.getBlockNumber(), opts?.signal)
  );
  const topic0 = HANDSHAKE_IFACE.getEvent("VouchAccepted")!.topicHash;
  let from = startBlockLukso();
  let chunk = DEFAULT_CHUNK;
  let cursor = from;

  const edgeKeys = new Set<string>();
  const edges: { voucher: string; target: string; strength: number }[] = [];
  const nodes = new Set<string>();
  const atCap = () => edges.length >= maxEdges;

  while (cursor <= latest && !atCap()) {
    if (opts?.signal?.aborted) throw new Error("Aborted");
    const to = cursor + chunk > latest ? latest : cursor + chunk;
    try {
      const logs = await withRpcRetry(
        () =>
          provider.getLogs({
            address: handshake,
            fromBlock: cursor,
            toBlock: to,
            topics: [topic0],
          }),
        opts?.signal
      );
      for (const log of logs) {
        let parsed;
        try {
          parsed = HANDSHAKE_IFACE.parseLog(log);
        } catch {
          continue;
        }
        if (!parsed) continue;
        const target = getAddress(parsed.args[0] as string).toLowerCase();
        const voucher = getAddress(parsed.args[1] as string).toLowerCase();
        const key = `${voucher}\0${target}`;
        if (edgeKeys.has(key)) continue;
        edgeKeys.add(key);
        edges.push({ voucher, target, strength: 1 });
        nodes.add(voucher);
        nodes.add(target);
        if (atCap()) break;
      }
      if (atCap()) break;
      cursor = to + 1n;
      if (chunk < DEFAULT_CHUNK) chunk = DEFAULT_CHUNK;
      if (cursor <= latest && GET_LOGS_INTER_CHUNK_MS > 0) {
        await sleep(GET_LOGS_INTER_CHUNK_MS, opts?.signal);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "Aborted") throw e;
      if (isRateLimitError(e) && chunk > 4000n) {
        chunk = chunk / 2n;
        continue;
      }
      if (chunk > 2000n && (msg.includes("limit") || msg.includes("too large") || msg.includes("range"))) {
        chunk = chunk / 2n;
        continue;
      }
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  const truncated = atCap() && cursor <= latest;
  const parts = [
    "LUKSO — map of who has endorsed whom among Universal Profiles using Handshake.",
  ];
  if (truncated) {
    parts.push(`Showing up to ${maxEdges} connections so the page stays responsive.`);
  }

  return {
    nodes: Array.from(nodes),
    edges,
    centerAddress: null,
    source: "lukso-rpc",
    message: parts.join(" "),
    truncated,
  };
}

/**
 * Top profiles by Handshake `acceptedCount`, summed across all configured chains.
 * Per chain: unique targets from VouchAccepted logs, then acceptedCount (matches profile UI).
 */
import { Contract, Interface, getAddress } from "ethers";
import chainConfig from "../../shared/chainConfig.json";
import { getHandshakeAddress, HANDSHAKE_CHAIN_IDS } from "@/config/contracts";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";

const HANDSHAKE_IFACE = new Interface([
  "event VouchAccepted(address indexed target, address indexed voucher)",
  "function acceptedCount(address target) view returns (uint256)",
]);

const DEFAULT_CHUNK = 15_000n;

/** Public RPCs (e.g. mainnet.base.org) 429 if we burst too many parallel eth_calls. */
const ACCEPTED_COUNT_CONCURRENCY = 4;
/** Small pause between getLogs chunks to stay under rate limits. */
const GET_LOGS_INTER_CHUNK_MS = 50;
const RPC_MAX_RETRIES = 6;
const RPC_BASE_DELAY_MS = 350;

/** Handshake UI only lists this many ranks. */
export const VOUCH_LEADERBOARD_TOP = 20;

/** In-memory cache TTL: leaderboard RPC work is expensive; refresh at most this often per session. */
export const VOUCH_LEADERBOARD_REFRESH_MS = 12 * 60 * 60 * 1000;

const leaderboardResultCache = new Map<
  number,
  { fetchedAt: number; data: { rows: VouchLeaderboardRow[]; error?: string } }
>();

function cloneLeaderboardResult(data: { rows: VouchLeaderboardRow[]; error?: string }) {
  return {
    rows: data.rows.map((r) => ({ ...r })),
    ...(data.error !== undefined ? { error: data.error } : {}),
  };
}

type ChainEntry = { rpc?: string; vouchSyncFromBlock?: string };

function rpcForChain(chainId: number): string | null {
  const c = (chainConfig as { chains?: Record<string, ChainEntry> }).chains?.[String(chainId)];
  const rpc = c?.rpc;
  return rpc && rpc.length > 0 ? rpc : null;
}

function startBlockForChain(chainId: number): bigint {
  const c = (chainConfig as { chains?: Record<string, ChainEntry> }).chains?.[String(chainId)];
  const raw = c?.vouchSyncFromBlock;
  if (raw && /^\d+$/.test(raw)) return BigInt(raw);
  return 0n;
}

/** Chains where Handshake address + RPC are both set in chainConfig. */
export function handshakeChainsConfigured(): number[] {
  return HANDSHAKE_CHAIN_IDS.filter((id) => {
    const h = getHandshakeAddress(id);
    const rpc = rpcForChain(id);
    return h != null && rpc != null;
  });
}

/** Human-readable network names for configured chains (for UI copy). */
export function configuredHandshakeChainLabels(): string[] {
  const chains = (chainConfig as { chains?: Record<string, { name?: string }> }).chains ?? {};
  return handshakeChainsConfigured().map((id) => chains[String(id)]?.name ?? `Chain ${id}`);
}

export interface VouchLeaderboardRow {
  address: string;
  /** Sum of accepted vouches across all included Handshake deployments. */
  acceptedVouches: number;
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
    if (signal?.aborted) {
      throw new Error("Aborted");
    }
    try {
      return await fn();
    } catch (e: unknown) {
      last = e;
      if (!isRateLimitError(e) || attempt === RPC_MAX_RETRIES - 1) {
        throw e;
      }
      const delay =
        RPC_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
      await sleep(delay, signal);
    }
  }
  throw last;
}

/**
 * Per-chain accepted counts for addresses that appear in VouchAccepted logs on that chain.
 */
async function fetchVouchCountsForChain(
  chainId: number,
  opts?: { signal?: AbortSignal }
): Promise<Map<string, number> | { error: string }> {
  const handshake = getHandshakeAddress(chainId);
  const rpc = rpcForChain(chainId);
  if (!handshake || !rpc) {
    return { error: `chain ${chainId}: missing Handshake or RPC` };
  }

  const provider = createJsonRpcProvider(rpc);
  const latest = BigInt(
    await withRpcRetry(() => provider.getBlockNumber(), opts?.signal)
  );
  let from = startBlockForChain(chainId);
  const topic0 = HANDSHAKE_IFACE.getEvent("VouchAccepted")!.topicHash;

  const targets = new Set<string>();

  let chunk = DEFAULT_CHUNK;
  let cursor = from;

  while (cursor <= latest) {
    if (opts?.signal?.aborted) {
      return { error: "Aborted" };
    }
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
        const target = parsed.args[0] as string;
        targets.add(getAddress(target).toLowerCase());
      }
      cursor = to + 1n;
      if (chunk < DEFAULT_CHUNK) chunk = DEFAULT_CHUNK;
      if (cursor <= latest && GET_LOGS_INTER_CHUNK_MS > 0) {
        await sleep(GET_LOGS_INTER_CHUNK_MS, opts?.signal);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isRateLimitError(e) && chunk > 4000n) {
        chunk = chunk / 2n;
        continue;
      }
      if (chunk > 2000n && (msg.includes("limit") || msg.includes("too large") || msg.includes("range"))) {
        chunk = chunk / 2n;
        continue;
      }
      return { error: msg || "getLogs failed" };
    }
  }

  if (targets.size === 0) {
    return new Map();
  }

  const c = new Contract(handshake, HANDSHAKE_IFACE, provider);
  const list = [...targets];
  const out = new Map<string, number>();
  for (let i = 0; i < list.length; i += ACCEPTED_COUNT_CONCURRENCY) {
    if (opts?.signal?.aborted) {
      return { error: "Aborted" };
    }
    const slice = list.slice(i, i + ACCEPTED_COUNT_CONCURRENCY);
    await Promise.all(
      slice.map(async (addr) => {
        try {
          const n = await withRpcRetry(() => c.acceptedCount(addr), opts?.signal);
          const bn = BigInt(n.toString());
          out.set(
            addr,
            Number(bn > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : bn)
          );
        } catch {
          out.set(addr, 0);
        }
      })
    );
  }

  return out;
}

/**
 * Global leaderboard: sums `acceptedCount` across every configured Handshake chain.
 */
export async function fetchVouchLeaderboard(
  limit: number,
  opts?: { signal?: AbortSignal }
): Promise<{ rows: VouchLeaderboardRow[]; error?: string }> {
  const cap = Math.min(
    VOUCH_LEADERBOARD_TOP,
    Math.max(1, Number.isFinite(limit) ? limit : VOUCH_LEADERBOARD_TOP)
  );

  const cached = leaderboardResultCache.get(cap);
  if (cached && Date.now() - cached.fetchedAt < VOUCH_LEADERBOARD_REFRESH_MS) {
    if (opts?.signal?.aborted) return { rows: [] };
    return cloneLeaderboardResult(cached.data);
  }

  const chains = handshakeChainsConfigured();
  if (chains.length === 0) {
    const emptyConfig: { rows: VouchLeaderboardRow[]; error?: string } = {
      rows: [],
      error: "No Handshake networks configured (set handshakeAddresses + chains RPC in chainConfig).",
    };
    if (!opts?.signal?.aborted) {
      leaderboardResultCache.set(cap, { fetchedAt: Date.now(), data: cloneLeaderboardResult(emptyConfig) });
    }
    return emptyConfig;
  }

  if (opts?.signal?.aborted) {
    return { rows: [] };
  }

  const settled: PromiseSettledResult<Map<string, number> | { error: string }>[] = [];
  for (const chainId of chains) {
    try {
      const val = await fetchVouchCountsForChain(chainId, opts);
      settled.push({ status: "fulfilled", value: val });
    } catch (reason) {
      settled.push({ status: "rejected", reason });
    }
  }

  const totals = new Map<string, number>();
  const chainWarnings: string[] = [];

  for (let i = 0; i < settled.length; i++) {
    const chainId = chains[i];
    const r = settled[i];
    if (r.status === "rejected") {
      const reason = r.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const isAbort =
        msg === "Aborted" ||
        (reason instanceof DOMException && reason.name === "AbortError") ||
        (reason instanceof Error && reason.name === "AbortError");
      if (isAbort) continue;
      chainWarnings.push(`Chain ${chainId}: ${msg}`);
      continue;
    }
    const val = r.value;
    if (!(val instanceof Map)) {
      if (val.error !== "Aborted") {
        chainWarnings.push(`Chain ${chainId}: ${val.error}`);
      }
      continue;
    }
    for (const [addr, n] of val) {
      totals.set(addr, (totals.get(addr) ?? 0) + n);
    }
  }

  if (totals.size === 0 && chainWarnings.length > 0) {
    if (opts?.signal?.aborted) {
      return { rows: [] };
    }
    return {
      rows: [],
      error: "Could not load data from all networks. Try again later.",
    };
  }

  const sorted = [...totals.entries()].sort((a, b) => {
    if (a[1] === b[1]) return 0;
    return a[1] > b[1] ? -1 : 1;
  });

  const rows: VouchLeaderboardRow[] = sorted.slice(0, cap).map(([addr, n]) => ({
    address: getAddress(addr),
    acceptedVouches: n,
  }));

  const result: { rows: VouchLeaderboardRow[]; error?: string } = { rows };
  if (!opts?.signal?.aborted) {
    leaderboardResultCache.set(cap, { fetchedAt: Date.now(), data: cloneLeaderboardResult(result) });
  }
  return result;
}

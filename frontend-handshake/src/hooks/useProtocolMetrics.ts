/**
 * Scans Handshake events on the selected chain to produce protocol-wide
 * metrics: unique users, vouch counts by status, recent activity.
 *
 * Runs only when the caller explicitly triggers `scan()` to avoid hammering
 * public RPCs on every admin page mount. Supports chunk halving on rate limits.
 */
import { useCallback, useRef, useState } from "react";
import { Interface, JsonRpcProvider, getAddress } from "ethers";
import { getRpcUrlForChain } from "@/lib/chainRpc";
import { getHandshakeAddress } from "@/config/contracts";

const HANDSHAKE_IFACE = new Interface([
  "event VouchRequested(address indexed target, address indexed voucher, uint8 category)",
  "event VouchAccepted(address indexed target, address indexed voucher)",
  "event VouchDenied(address indexed target, address indexed voucher)",
  "event VouchCancelled(address indexed target, address indexed voucher)",
  "event VouchRemoved(address indexed target, address indexed voucher)",
  "event VouchHidden(address indexed target, address indexed voucher)",
  "event FeesWithdrawn(address collector, uint256 amount)",
  "function accumulatedFees() view returns (uint256)",
]);

const DEFAULT_CHUNK = 20_000n;
const MIN_CHUNK = 2_000n;
const INTER_CHUNK_MS = 40;

/** Reasonable deployment-era block floors to avoid scanning genesis on public RPCs. */
const FROM_BLOCK_HINTS: Record<number, bigint> = {
  1: 20_000_000n,
  42: 4_000_000n,
  4201: 0n,
  8453: 25_000_000n,
  84532: 0n,
};

export interface ProtocolMetrics {
  totalVouches: number;
  accepted: number;
  denied: number;
  cancelled: number;
  removed: number;
  hidden: number;
  pending: number;
  uniqueVouchers: number;
  uniqueTargets: number;
  uniqueUsers: number;
  feesWithdrawnTxCount: number;
  latestBlockScanned: bigint;
  fromBlock: bigint;
}

const EMPTY: ProtocolMetrics = {
  totalVouches: 0,
  accepted: 0,
  denied: 0,
  cancelled: 0,
  removed: 0,
  hidden: 0,
  pending: 0,
  uniqueVouchers: 0,
  uniqueTargets: 0,
  uniqueUsers: 0,
  feesWithdrawnTxCount: 0,
  latestBlockScanned: 0n,
  fromBlock: 0n,
};

export interface UseProtocolMetricsResult {
  metrics: ProtocolMetrics | null;
  loading: boolean;
  progress: number;
  error: string | null;
  scan: (overrides?: { fromBlock?: bigint }) => Promise<void>;
  cancel: () => void;
}

function isRateLimitError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("limit exceeded") ||
    msg.includes("range") ||
    msg.includes("too large")
  );
}

async function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
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

export function useProtocolMetrics(chainId: number): UseProtocolMetricsResult {
  const [metrics, setMetrics] = useState<ProtocolMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const scan = useCallback(
    async (overrides?: { fromBlock?: bigint }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const handshake = getHandshakeAddress(chainId);
      const rpc = getRpcUrlForChain(chainId);
      if (!handshake || !rpc) {
        setError("Handshake or RPC not configured for this chain.");
        setMetrics(null);
        return;
      }

      setLoading(true);
      setProgress(0);
      setError(null);

      try {
        const provider = new JsonRpcProvider(rpc, undefined, {
          batchMaxCount: 1,
          batchStallTime: 0,
        });

        const latest = BigInt(await provider.getBlockNumber());
        const from = overrides?.fromBlock ?? FROM_BLOCK_HINTS[chainId] ?? 0n;
        const totalRange = latest > from ? latest - from : 1n;

        const counts = {
          totalVouches: 0,
          accepted: 0,
          denied: 0,
          cancelled: 0,
          removed: 0,
          hidden: 0,
          feesWithdrawnTxCount: 0,
        };
        const vouchers = new Set<string>();
        const targets = new Set<string>();

        const topics: Array<{ topic: string; name: string }> = [
          { topic: HANDSHAKE_IFACE.getEvent("VouchRequested")!.topicHash, name: "VouchRequested" },
          { topic: HANDSHAKE_IFACE.getEvent("VouchAccepted")!.topicHash, name: "VouchAccepted" },
          { topic: HANDSHAKE_IFACE.getEvent("VouchDenied")!.topicHash, name: "VouchDenied" },
          { topic: HANDSHAKE_IFACE.getEvent("VouchCancelled")!.topicHash, name: "VouchCancelled" },
          { topic: HANDSHAKE_IFACE.getEvent("VouchRemoved")!.topicHash, name: "VouchRemoved" },
          { topic: HANDSHAKE_IFACE.getEvent("VouchHidden")!.topicHash, name: "VouchHidden" },
          { topic: HANDSHAKE_IFACE.getEvent("FeesWithdrawn")!.topicHash, name: "FeesWithdrawn" },
        ];

        const topicsUnion = topics.map((t) => t.topic);

        let cursor = from;
        let chunk = DEFAULT_CHUNK;

        while (cursor <= latest) {
          if (ac.signal.aborted) throw new Error("Aborted");
          const to = cursor + chunk > latest ? latest : cursor + chunk;
          try {
            const logs = await provider.getLogs({
              address: handshake,
              fromBlock: cursor,
              toBlock: to,
              topics: [topicsUnion],
            });
            for (const log of logs) {
              const t0 = log.topics?.[0];
              if (!t0) continue;
              let parsed;
              try {
                parsed = HANDSHAKE_IFACE.parseLog(log);
              } catch {
                continue;
              }
              if (!parsed) continue;
              switch (parsed.name) {
                case "VouchRequested": {
                  counts.totalVouches += 1;
                  const target = parsed.args[0] as string;
                  const voucher = parsed.args[1] as string;
                  try {
                    targets.add(getAddress(target).toLowerCase());
                    vouchers.add(getAddress(voucher).toLowerCase());
                  } catch {
                    /* ignore */
                  }
                  break;
                }
                case "VouchAccepted":
                  counts.accepted += 1;
                  break;
                case "VouchDenied":
                  counts.denied += 1;
                  break;
                case "VouchCancelled":
                  counts.cancelled += 1;
                  break;
                case "VouchRemoved":
                  counts.removed += 1;
                  break;
                case "VouchHidden":
                  counts.hidden += 1;
                  break;
                case "FeesWithdrawn":
                  counts.feesWithdrawnTxCount += 1;
                  break;
              }
            }
            const scanned = to - from;
            setProgress(Number((scanned * 100n) / totalRange));
            cursor = to + 1n;
            if (chunk < DEFAULT_CHUNK) chunk = DEFAULT_CHUNK;
            if (cursor <= latest && INTER_CHUNK_MS > 0) {
              await sleep(INTER_CHUNK_MS, ac.signal);
            }
          } catch (e) {
            if (ac.signal.aborted) throw e;
            if (isRateLimitError(e) && chunk > MIN_CHUNK) {
              chunk = chunk / 2n;
              await sleep(400, ac.signal);
              continue;
            }
            throw e;
          }
        }

        const pending =
          counts.totalVouches -
          counts.accepted -
          counts.denied -
          counts.cancelled -
          counts.removed;

        const union = new Set<string>([...vouchers, ...targets]);

        const out: ProtocolMetrics = {
          totalVouches: counts.totalVouches,
          accepted: counts.accepted,
          denied: counts.denied,
          cancelled: counts.cancelled,
          removed: counts.removed,
          hidden: counts.hidden,
          pending: Math.max(0, pending),
          uniqueVouchers: vouchers.size,
          uniqueTargets: targets.size,
          uniqueUsers: union.size,
          feesWithdrawnTxCount: counts.feesWithdrawnTxCount,
          latestBlockScanned: latest,
          fromBlock: from,
        };
        setMetrics(out);
        setProgress(100);
      } catch (e) {
        if ((e as Error)?.message === "Aborted") {
          setMetrics(null);
        } else {
          setError(e instanceof Error ? e.message : String(e));
          setMetrics((prev) => prev ?? { ...EMPTY });
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setLoading(false);
      }
    },
    [chainId]
  );

  return { metrics, loading, progress, error, scan, cancel };
}

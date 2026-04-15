/** Shared JSON-RPC helpers to reduce 429 / rate-limit failures on public endpoints. */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitedError(e: unknown): boolean {
  const msg = String(
    e && typeof e === "object" && "message" in e ? (e as Error).message : e
  ).toLowerCase();
  if (msg.includes("429") || msg.includes("too many requests")) return true;
  if (msg.includes("-32016") || msg.includes("rate limit")) return true;
  const code = (e as { code?: string })?.code;
  if (code === "SERVER_ERROR") return true;
  return false;
}

/**
 * Retry transient rate limits with exponential backoff + jitter.
 */
export async function withRpcRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRateLimitedError(e) || attempt === maxAttempts - 1) throw e;
      await sleep(200 * 2 ** attempt + Math.floor(Math.random() * 120));
    }
  }
  throw last;
}

/** Small pause between heavy multi-chain loops to avoid bursting public RPCs. */
export function rpcPauseBetweenChains(): Promise<void> {
  return sleep(100);
}

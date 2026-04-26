/**
 * Vouch leaderboard types and client fetch for GET /api/vouch-leaderboard
 * (RPC-heavy aggregation runs server-side; see api/vouch-leaderboard.js).
 */
import type { IndexerLeaderboardProfile } from "@/lib/lspIndexerProfiles";

/** Handshake UI only lists this many ranks. */
export const VOUCH_LEADERBOARD_TOP = 20;

export interface VouchLeaderboardRow {
  address: string;
  /** Sum of accepted vouches across all included Handshake deployments. */
  acceptedVouches: number;
}

/** Response from GET /api/vouch-leaderboard (server-built snapshot + indexer profiles). */
export interface VouchLeaderboardApiResponse {
  generatedAt: number;
  rows: VouchLeaderboardRow[];
  profiles: Record<string, IndexerLeaderboardProfile>;
  error?: string;
}

/**
 * Fetches cached leaderboard JSON from the app API (one RPC build per ~12h on the server).
 */
export async function fetchVouchLeaderboardFromApi(
  limit: number = VOUCH_LEADERBOARD_TOP,
  opts?: { signal?: AbortSignal }
): Promise<VouchLeaderboardApiResponse> {
  const cap = Math.min(VOUCH_LEADERBOARD_TOP, Math.max(1, limit));
  const res = await fetch(`/api/vouch-leaderboard?limit=${cap}`, {
    signal: opts?.signal,
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let data: VouchLeaderboardApiResponse;
  try {
    data = JSON.parse(text) as VouchLeaderboardApiResponse;
  } catch {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    throw new Error(
      text.trimStart().startsWith("<")
        ? "Leaderboard returned HTML, not JSON — usually /api is rewritten to the SPA. Redeploy with updated vercel.json."
        : "Invalid response from /api/vouch-leaderboard."
    );
  }
  if (!res.ok) {
    const msg = data?.error;
    throw new Error(typeof msg === "string" && msg.length > 0 ? msg : `HTTP ${res.status}`);
  }
  return data;
}

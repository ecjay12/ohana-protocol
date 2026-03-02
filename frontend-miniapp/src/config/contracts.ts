/**
 * Handshake addresses and chain list.
 * Source: shared/chainConfig.json from frontend-handshake.
 */
import chainConfig from "@shared/chainConfig.json";

/** Production miniapp URL for Grid iframe src (use when copying "Add to profile" link). */
export const MINIAPP_PRODUCTION_URL = "https://frontend-miniapp-ecjay12s-projects.vercel.app";

const rawAddresses = chainConfig.handshakeAddresses as Record<string, string>;
export const HANDSHAKE_ADDRESSES: Record<number, string> = Object.fromEntries(
  Object.entries(rawAddresses).map(([k, v]) => [parseInt(k, 10), v])
) as Record<number, string>;

/** Chain IDs supported by Handshake (LUKSO focus for miniapp). */
export const HANDSHAKE_CHAIN_IDS = Object.keys(rawAddresses).map((k) => parseInt(k, 10)) as [number, ...number[]];

/**
 * Vouch fee per chain (display only; actual fee read from contract).
 */
export const VOUCH_FEE_DISPLAY: Record<number, { amount: string; symbol: string }> = {
  1: { amount: "0.0009", symbol: "ETH" },
  42: { amount: "0.1", symbol: "LYX" },
  8453: { amount: "0.0009", symbol: "ETH" },
  4201: { amount: "0.1", symbol: "LYX" },
  84532: { amount: "0.0009", symbol: "ETH" },
};

export function getHandshakeAddress(chainId: number): string | null {
  const addr = HANDSHAKE_ADDRESSES[chainId];
  return addr && addr.length > 0 ? addr : null;
}

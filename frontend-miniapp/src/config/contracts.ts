/**
 * Handshake addresses and chain list.
 * Source: shared/chainConfig.json from frontend-handshake.
 */
import chainConfig from "@shared/chainConfig.json";

const trimOrigin = (u: string | undefined) => u?.replace(/\/$/, "") ?? "";

/** Miniapp URL for Grid iframe src — current origin in the browser; override via env for non-browser contexts. */
export const MINIAPP_PRODUCTION_URL =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : trimOrigin(import.meta.env.VITE_MINIAPP_PUBLIC_ORIGIN);

/** Main Handshake app — “View vouch activity” (set `VITE_FULL_APP_URL` in Vercel to your deployment). */
export const FULL_APP_URL =
  trimOrigin(import.meta.env.VITE_FULL_APP_URL) || "https://ohanahandshake.com";

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

/**
 * Absolute `/add-to-grid` URL for this deployment.
 * When the miniapp runs inside a profile Grid iframe, open this with `target="_blank"` so the
 * injected wallet (MetaMask / UP extension) is available — it is often not exposed to cross-origin iframes.
 */
export function addToGridAbsoluteUrl(): string {
  const base = trimOrigin(
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : (import.meta.env.VITE_MINIAPP_PUBLIC_ORIGIN as string | undefined)
  );
  return base ? `${base}/add-to-grid` : "/add-to-grid";
}

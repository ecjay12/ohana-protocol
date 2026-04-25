// @ts-nocheck — ESM in /shared; Vite bundles it; Node uses the same mjs in /api
import { getDappUrlMarkersFromEnv, lsp28DataValueMentionsDapp } from "../../shared/handshakeDappMarkers.mjs";

export { getDappUrlMarkersFromEnv, lsp28DataValueMentionsDapp };

export function getDappUrlMarkersVite(): string[] {
  return getDappUrlMarkersFromEnv(import.meta.env);
}

const API_PATH = "/api/handshake-activity";

/**
 * Single fast request: server builds + caches dapp-scoped feed (LSP28 + Handshake vouches only).
 */
export async function fetchHandshakeActivityFromApi(
  signal?: AbortSignal
): Promise<{ items: unknown[]; generatedAt?: number } | null> {
  try {
    const r = await fetch(
      typeof window !== "undefined" ? new URL(API_PATH, window.location.origin).toString() : API_PATH,
      { signal, headers: { Accept: "application/json" } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { items?: LuksoActivityItem[]; generatedAt?: number };
    if (!Array.isArray(j.items)) return null;
    return { items: j.items, generatedAt: j.generatedAt };
  } catch {
    return null;
  }
}

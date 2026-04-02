/**
 * Public developer-facing URLs. Override in Vercel / .env when the canonical
 * host or repo differs from defaults (e.g. fork, custom domain).
 */

function trimSlash(u: string | undefined): string {
  return u?.replace(/\/$/, "") ?? "";
}

/** Canonical production Handshake dashboard (API, embeds, /integrate examples). */
export const PRODUCTION_HANDSHAKE_APP_URL = "https://ohanahandshake.com";

export const GITHUB_REPO_URL = (
  import.meta.env.VITE_GITHUB_REPO_URL as string | undefined
)?.replace(/\/$/, "") ?? "https://github.com/ecjay12/ohana-protocol";

/**
 * Base URL for /integrate examples — always production-facing for integrators (never localhost).
 * Set `VITE_PUBLIC_APP_URL` if you use a custom domain.
 */
export function getIntegrationExampleBaseUrl(): string {
  const fromEnv = trimSlash(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);
  if (fromEnv) return fromEnv;
  return PRODUCTION_HANDSHAKE_APP_URL;
}

/**
 * Base for in-app copy (embed URL, etc.): env override, else current origin, else production default.
 */
export function getPublicAppBaseUrl(): string {
  const fromEnv = trimSlash(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined);
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return PRODUCTION_HANDSHAKE_APP_URL;
}

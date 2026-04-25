/**
 * URL markers to detect "our" Handshake LSP28 grid (miniapp / app embed) in ERC725Y data.
 * Used by the activity API and client-side fallback. Keep hostnames lowercase in checks.
 */
const DEFAULT_HOSTS = Object.freeze(["handshake.ohana.gg", "ohanahandshake.com"]);

function parseHostnameFromUrlString(v) {
  if (!v || !String(v).trim()) return null;
  const s = String(v).trim();
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    return u.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string | boolean | undefined> | undefined} env - `import.meta.env` (Vite) or `process.env` (Node)
 */
export function getDappUrlMarkersFromEnv(env) {
  const s = new Set(DEFAULT_HOSTS);
  if (!env) return Array.from(s);
  const keys = ["VITE_MINIAPP_URL", "VITE_PUBLIC_APP_URL", "HANDSHAKE_MINIAPP_URL", "VITE_DEV_SERVER_URL"];
  for (const k of keys) {
    const h = parseHostnameFromUrlString(env[k]);
    if (h) s.add(h);
  }
  return Array.from(s);
}

/**
 * @param {string} dataValue - hex `0x…` from indexer `data_changed.data_value`
 * @param {string[]} markers - hostnames to find (e.g. `handshake.ohana.gg`)
 */
export function lsp28DataValueMentionsDapp(dataValue, markers) {
  if (!dataValue || !markers.length) return false;
  const lower = markers.map((m) => m.toLowerCase()).filter(Boolean);
  if (lower.length === 0) return false;

  const raw = String(dataValue).toLowerCase();
  for (const m of lower) {
    if (raw.includes(m)) return true;
  }

  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (hex.length < 4 || /[^0-9a-f]/.test(hex)) {
    return false;
  }
  let utf8 = "";
  try {
    const n = Math.floor(hex.length / 2);
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes).toLowerCase();
  } catch {
    return false;
  }
  for (const m of lower) {
    if (utf8.includes(m)) return true;
  }
  return false;
}

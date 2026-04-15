/**
 * Per–Universal Profile list of linked EOAs the owner chose to hide from their Handshake UI.
 * On-chain EOA→UP registration is unchanged — this is display-only (localStorage).
 */
const STORAGE_KEY = "ohana.hiddenLinkedWallets.v1";

export type HiddenLinkedWalletsMap = Record<string, string[]>;

function readAll(): HiddenLinkedWalletsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as HiddenLinkedWalletsMap;
  } catch {
    return {};
  }
}

function writeAll(data: HiddenLinkedWalletsMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function getHiddenLinkedEoas(profileAddressLower: string): string[] {
  const all = readAll();
  const xs = all[profileAddressLower];
  if (!Array.isArray(xs)) return [];
  return xs.filter((a) => typeof a === "string" && a.startsWith("0x"));
}

export function setHiddenLinkedEoas(profileAddressLower: string, addressesLower: string[]) {
  const all = readAll();
  const next = { ...all, [profileAddressLower]: [...new Set(addressesLower.map((a) => a.toLowerCase()))] };
  writeAll(next);
}

export function toggleHiddenLinkedEoa(
  profileAddressLower: string,
  eoaLower: string,
  hide: boolean
): string[] {
  const cur = new Set(getHiddenLinkedEoas(profileAddressLower).map((a) => a.toLowerCase()));
  if (hide) cur.add(eoaLower.toLowerCase());
  else cur.delete(eoaLower.toLowerCase());
  const out = Array.from(cur);
  setHiddenLinkedEoas(profileAddressLower, out);
  return out;
}

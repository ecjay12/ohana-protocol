const STORAGE_PREFIX = "handshake-hidden-vouchers";

function storageKey(chainId: number, account: string): string {
  return `${STORAGE_PREFIX}-${chainId}-${account.toLowerCase()}`;
}

export function getHiddenVouchers(chainId: number, account: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(chainId, account));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function addHiddenVoucher(chainId: number, account: string, voucherAddress: string): void {
  const set = getHiddenVouchers(chainId, account);
  set.add(voucherAddress.toLowerCase());
  try {
    localStorage.setItem(storageKey(chainId, account), JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

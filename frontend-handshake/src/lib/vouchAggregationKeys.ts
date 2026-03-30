/**
 * Composite keys for multi-chain UP vouch aggregation.
 * Plain addresses (non-UP / single-chain) stay unprefixed.
 */
import { getAddress } from "ethers";

const RECV_PREFIX = "r";
const GIVEN_PREFIX = "g";

export function makeReceivedVouchKey(
  chainId: number,
  target: string,
  voucher: string
): string {
  return `${RECV_PREFIX}:${chainId}:${getAddress(target)}:${getAddress(voucher)}`;
}

export function makeGivenVouchKey(
  chainId: number,
  target: string,
  voucher: string
): string {
  return `${GIVEN_PREFIX}:${chainId}:${getAddress(target)}:${getAddress(voucher)}`;
}

export function parseReceivedVouchKey(
  key: string
): { chainId: number; target: string; voucher: string } | null {
  if (!key.startsWith(`${RECV_PREFIX}:`)) return null;
  const parts = key.split(":");
  if (parts.length !== 4) return null;
  const chainId = Number(parts[1]);
  if (!Number.isFinite(chainId)) return null;
  try {
    return {
      chainId,
      target: getAddress(parts[2]),
      voucher: getAddress(parts[3]),
    };
  } catch {
    return null;
  }
}

export function parseGivenVouchKey(
  key: string
): { chainId: number; target: string; voucher: string } | null {
  if (!key.startsWith(`${GIVEN_PREFIX}:`)) return null;
  const parts = key.split(":");
  if (parts.length !== 4) return null;
  const chainId = Number(parts[1]);
  if (!Number.isFinite(chainId)) return null;
  try {
    return {
      chainId,
      target: getAddress(parts[2]),
      voucher: getAddress(parts[3]),
    };
  } catch {
    return null;
  }
}

/** Voucher address for profile links (received / accepted vouches). */
export function displayAddressFromReceivedKey(key: string): string {
  const r = parseReceivedVouchKey(key);
  return r ? r.voucher : key;
}

/** Target address for profile links (given vouches — who received). */
export function displayAddressFromGivenKey(key: string): string {
  const g = parseGivenVouchKey(key);
  return g ? g.target : key;
}

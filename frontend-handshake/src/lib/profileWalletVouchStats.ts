/**
 * Per-identity vouch counts for UP + linked EOAs (multi-chain composite keys).
 */
import { getAddress } from "ethers";
import { parseGivenVouchKey, parseReceivedVouchKey } from "@/lib/vouchAggregationKeys";
import type { VouchData } from "@/types/handshake";

export type IdentityVouchStat = {
  address: string;
  /** Incoming vouches to this identity (as target). */
  received: number;
  /** Outgoing vouches from this identity (as voucher). */
  given: number;
};

export function aggregateVouchCountsByIdentity(
  identityAddresses: string[],
  vouchersForTarget: string[],
  vouchStatuses: Record<string, VouchData>,
  targetsVouchedBy: string[],
  givenVouchStatuses: Record<string, VouchData>,
  options: { isOwnProfile: boolean }
): IdentityVouchStat[] {
  const lower = (a: string) => a.toLowerCase();
  const normalizedIds = identityAddresses
    .map((a) => {
      try {
        return getAddress(a);
      } catch {
        return null;
      }
    })
    .filter((a): a is string => a != null);

  const recvBy = new Map<string, number>();
  const givenBy = new Map<string, number>();
  for (const id of normalizedIds) {
    recvBy.set(lower(id), 0);
    givenBy.set(lower(id), 0);
  }

  const idSet = new Set(normalizedIds.map(lower));

  for (const key of vouchersForTarget) {
    const p = parseReceivedVouchKey(key);
    if (!p) continue;
    const t = lower(p.target);
    if (!idSet.has(t)) continue;
    const st = vouchStatuses[key];
    if (!options.isOwnProfile && st?.hidden) continue;
    recvBy.set(t, (recvBy.get(t) ?? 0) + 1);
  }

  for (const key of targetsVouchedBy) {
    const p = parseGivenVouchKey(key);
    if (!p) continue;
    const v = lower(p.voucher);
    if (!idSet.has(v)) continue;
    const st = givenVouchStatuses[key];
    if (!options.isOwnProfile && st?.hidden) continue;
    givenBy.set(v, (givenBy.get(v) ?? 0) + 1);
  }

  return normalizedIds.map((addr) => ({
    address: addr,
    received: recvBy.get(lower(addr)) ?? 0,
    given: givenBy.get(lower(addr)) ?? 0,
  }));
}

export function sumIdentityVouchStats(rows: IdentityVouchStat[]) {
  return rows.reduce(
    (acc, r) => ({
      given: acc.given + r.given,
      received: acc.received + r.received,
      total: acc.total + r.given + r.received,
    }),
    { given: 0, received: 0, total: 0 }
  );
}

export type BuildIdentityVouchStatsOptions = {
  /** Owner-only: omit these linked EOAs from rows and from aggregated counts (display preference; localStorage). */
  hiddenIdentityLowerSet?: Set<string>;
};

/** Shared by ProfilePage and UpIdentityPage — UP aggregation + optional connected EOA row. */
export function buildIdentityVouchStatsForUpProfile(
  isUP: boolean,
  profileAddress: string | null,
  linkedEOAs: string[],
  vouchersForTarget: string[],
  vouchStatuses: Record<string, VouchData>,
  targetsVouchedBy: string[],
  givenVouchStatuses: Record<string, VouchData>,
  account: string | null,
  viewerIsProfileOwner: boolean,
  options?: BuildIdentityVouchStatsOptions
): IdentityVouchStat[] | undefined {
  if (!isUP || !profileAddress) return undefined;
  let normalized: string;
  try {
    normalized = getAddress(profileAddress.trim());
  } catch {
    return undefined;
  }
  const sortedEoas = [...linkedEOAs].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const idsBase = [normalized, ...sortedEoas];
  const idLower = new Set(idsBase.map((a) => a.toLowerCase()));
  let ids = idsBase;
  if (viewerIsProfileOwner && account) {
    try {
      const a = getAddress(account);
      if (!idLower.has(a.toLowerCase())) {
        ids = [...idsBase, a];
      }
    } catch {
      /* ignore */
    }
  }
  const profileLower = normalized.toLowerCase();
  if (options?.hiddenIdentityLowerSet?.size) {
    const h = options.hiddenIdentityLowerSet;
    ids = ids.filter((addr) => {
      if (addr.toLowerCase() === profileLower) return true;
      return !h.has(addr.toLowerCase());
    });
  }
  return aggregateVouchCountsByIdentity(
    ids,
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    { isOwnProfile: viewerIsProfileOwner }
  );
}

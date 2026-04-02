/**
 * Fetches received and given vouches for a profile address via read-only contract.
 * When isUP, aggregates vouches from linked EOAs (EOARegistered) and across
 * hardcoded chains (see upProfileAggregation.ts).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Contract, getAddress } from "ethers";
import { createJsonRpcProvider } from "@/lib/jsonRpcProvider";
import { getHandshakeAddress } from "@/config/contracts";
import { getAggregationChainsWithHandshake } from "@/config/upProfileAggregation";
import { CHAINS } from "@/hooks/useInjectedWallet";
import { getEOAsForUP } from "@/lib/upEoaLookup";
import {
  makeReceivedVouchKey,
  makeGivenVouchKey,
} from "@/lib/vouchAggregationKeys";
import type { VouchData, VouchStatus } from "@/types/handshake";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

const LUKSO_CHAIN_IDS = [42, 4201] as const;

function getEffectiveChainId(chainId: number, isUP: boolean): number {
  if (!isUP) return chainId;
  return LUKSO_CHAIN_IDS.includes(chainId as (typeof LUKSO_CHAIN_IDS)[number])
    ? chainId
    : 4201;
}

function createReadOnlyContract(chainId: number): Contract | null {
  const addr = getHandshakeAddress(chainId);
  const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
  if (!addr || !rpc) return null;
  return new Contract(
    addr,
    HandshakeArtifact?.abi ?? [],
    createJsonRpcProvider(rpc)
  );
}

export function useProfileVouches(
  address: string | null,
  chainId: number,
  isUP = false
) {
  const normalizedAddress = useMemo(() => {
    if (!address) return null;
    try {
      return getAddress(address.trim());
    } catch {
      return null;
    }
  }, [address]);

  const effectiveChainId = useMemo(
    () => getEffectiveChainId(chainId, isUP),
    [chainId, isUP]
  );
  const contractAddress = getHandshakeAddress(effectiveChainId);
  const rpc = CHAINS[effectiveChainId as keyof typeof CHAINS]?.rpc;

  const roContract = useMemo(() => {
    if (!contractAddress || !rpc) return null;
    return new Contract(
      contractAddress,
      HandshakeArtifact?.abi ?? [],
      createJsonRpcProvider(rpc)
    );
  }, [contractAddress, rpc]);

  const aggregationChains = useMemo(
    () => getAggregationChainsWithHandshake(),
    []
  );

  const aggregationKey = useMemo(() => aggregationChains.join(","), [aggregationChains]);

  /** Stable primitive — avoid `Contract` in effect deps (identity churn → RPC loops / 429). */
  const contractPin = useMemo(
    () =>
      contractAddress && rpc ? `${effectiveChainId}:${contractAddress}:${rpc}` : "",
    [effectiveChainId, contractAddress, rpc]
  );

  const isSupported = useMemo(() => {
    if (isUP) return aggregationChains.length > 0;
    return !!roContract;
  }, [isUP, aggregationChains.length, roContract]);

  const [vouchersForTarget, setVouchersForTarget] = useState<string[]>([]);
  const [vouchStatuses, setVouchStatuses] = useState<Record<string, VouchData>>({});
  const [targetsVouchedBy, setTargetsVouchedBy] = useState<string[]>([]);
  const [givenVouchStatuses, setGivenVouchStatuses] = useState<Record<string, VouchData>>({});
  const [aggregatedAcceptedCount, setAggregatedAcceptedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGiven, setLoadingGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receivedGenRef = useRef(0);
  const givenGenRef = useRef(0);

  useEffect(() => {
    if (!normalizedAddress || !isSupported) {
      setVouchersForTarget([]);
      setVouchStatuses({});
      setAggregatedAcceptedCount(null);
      return;
    }

    if (isUP) {
      const myId = ++receivedGenRef.current;
      setLoading(true);
      setError(null);

      const run = async () => {
        try {
          const allKeys = new Set<string>();
          const statusMap: Record<string, VouchData> = {};
          let totalAccepted = 0;

          /** Same wallet addresses on every chain; link is stored on LUKSO registry only. */
          const linkedEOAs = await getEOAsForUP(normalizedAddress, effectiveChainId);
          const identityAddressesAll = [normalizedAddress, ...linkedEOAs];

          for (const cid of aggregationChains) {
            const c = createReadOnlyContract(cid);
            if (!c) continue;

            const identityAddresses = identityAddressesAll;

            for (const identity of identityAddresses) {
              const vouchers: string[] = await c.getVouchersFor(identity);
              for (const v of vouchers) {
                const vAddr = getAddress(v);
                const key = makeReceivedVouchKey(cid, identity, vAddr);
                allKeys.add(key);
                try {
                  const raw = await c.getVouch(identity, vAddr);
                  if (raw)
                    statusMap[key] = {
                      category: Number(raw.category),
                      status: Number(raw.status) as VouchStatus,
                      timestamp: raw.timestamp,
                      updatedAt: raw.updatedAt,
                      hidden: Boolean(raw.hidden),
                    };
                } catch {
                  /* ignore */
                }
              }
            }

            for (const identity of identityAddresses) {
              try {
                const count = await c.acceptedCount(identity);
                totalAccepted += Number(count);
              } catch {
                /* ignore */
              }
            }
          }

          if (myId !== receivedGenRef.current) return;
          setVouchersForTarget(Array.from(allKeys));
          setVouchStatuses(statusMap);
          setAggregatedAcceptedCount(totalAccepted);
        } catch (e: unknown) {
          if (myId === receivedGenRef.current) {
            setError(e instanceof Error ? e.message : "Failed to load vouches");
          }
        } finally {
          if (myId === receivedGenRef.current) setLoading(false);
        }
      };

      run();
      return;
    }

    if (!roContract) {
      setVouchersForTarget([]);
      setVouchStatuses({});
      setAggregatedAcceptedCount(null);
      return;
    }

    const myId = ++receivedGenRef.current;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const identityAddresses: string[] = [normalizedAddress];

        const allVouchers = new Set<string>();
        const voucherToTarget = new Map<string, string>();

        for (const identity of identityAddresses) {
          const vouchers: string[] = await roContract.getVouchersFor(identity);
          for (const v of vouchers) {
            allVouchers.add(getAddress(v));
            if (!voucherToTarget.has(getAddress(v))) {
              voucherToTarget.set(getAddress(v), identity);
            }
          }
        }

        const vouchersList = Array.from(allVouchers);
        if (myId !== receivedGenRef.current) return;
        setVouchersForTarget(vouchersList);

        const statusMap: Record<string, VouchData> = {};
        await Promise.all(
          vouchersList.map(async (voucher) => {
            const target = voucherToTarget.get(voucher) ?? identityAddresses[0];
            try {
              const v = await roContract.getVouch(target, voucher);
              if (v)
                statusMap[voucher] = {
                  category: Number(v.category),
                  status: Number(v.status) as VouchStatus,
                  timestamp: v.timestamp,
                  updatedAt: v.updatedAt,
                  hidden: Boolean(v.hidden),
                };
            } catch {
              /* ignore */
            }
          })
        );
        if (myId === receivedGenRef.current) setVouchStatuses(statusMap);
        if (myId === receivedGenRef.current) setAggregatedAcceptedCount(null);
      } catch (e: unknown) {
        if (myId === receivedGenRef.current) {
          setError(e instanceof Error ? e.message : "Failed to load vouches");
        }
      } finally {
        if (myId === receivedGenRef.current) setLoading(false);
      }
    };

    run();
  }, [
    normalizedAddress,
    contractPin,
    aggregationKey,
    isUP,
    chainId,
    effectiveChainId,
    isSupported,
  ]);

  useEffect(() => {
    if (!normalizedAddress || !isSupported) {
      setTargetsVouchedBy([]);
      setGivenVouchStatuses({});
      return;
    }

    if (isUP) {
      const myId = ++givenGenRef.current;
      setLoadingGiven(true);

      const run = async () => {
        try {
          const allKeys = new Set<string>();
          const statusMap: Record<string, VouchData> = {};

          const linkedEOAs = await getEOAsForUP(normalizedAddress, effectiveChainId);
          const identityAddressesAll = [normalizedAddress, ...linkedEOAs];

          for (const cid of aggregationChains) {
            const c = createReadOnlyContract(cid);
            if (!c) continue;

            const identityAddresses = identityAddressesAll;

            for (const voucherIdentity of identityAddresses) {
              const targets: string[] = await c.getTargetsVouchedBy(voucherIdentity);
              for (const t of targets) {
                const tAddr = getAddress(t);
                const vAddr = getAddress(voucherIdentity);
                const key = makeGivenVouchKey(cid, tAddr, vAddr);
                allKeys.add(key);
                try {
                  const raw = await c.getVouch(tAddr, vAddr);
                  if (raw)
                    statusMap[key] = {
                      category: Number(raw.category),
                      status: Number(raw.status) as VouchStatus,
                      timestamp: raw.timestamp,
                      updatedAt: raw.updatedAt,
                      hidden: Boolean(raw.hidden),
                    };
                } catch {
                  /* ignore */
                }
              }
            }
          }

          if (myId !== givenGenRef.current) return;
          setTargetsVouchedBy(Array.from(allKeys));
          setGivenVouchStatuses(statusMap);
        } catch {
          if (myId === givenGenRef.current) setTargetsVouchedBy([]);
        } finally {
          if (myId === givenGenRef.current) setLoadingGiven(false);
        }
      };

      run();
      return;
    }

    if (!roContract) {
      setTargetsVouchedBy([]);
      setGivenVouchStatuses({});
      return;
    }

    const myId = ++givenGenRef.current;
    setLoadingGiven(true);

    const run = async () => {
      try {
        const identityAddresses: string[] = [normalizedAddress];

        const allTargets = new Set<string>();
        const targetToVoucher = new Map<string, string>();

        for (const identity of identityAddresses) {
          const targets: string[] = await roContract.getTargetsVouchedBy(identity);
          for (const t of targets) {
            allTargets.add(getAddress(t));
            if (!targetToVoucher.has(getAddress(t))) {
              targetToVoucher.set(getAddress(t), identity);
            }
          }
        }

        const targetsList = Array.from(allTargets);
        if (myId !== givenGenRef.current) return;
        setTargetsVouchedBy(targetsList);

        const statusMap: Record<string, VouchData> = {};
        await Promise.all(
          targetsList.map(async (target) => {
            const voucher = targetToVoucher.get(target) ?? identityAddresses[0];
            try {
              const v = await roContract.getVouch(target, voucher);
              if (v)
                statusMap[target] = {
                  category: Number(v.category),
                  status: Number(v.status) as VouchStatus,
                  timestamp: v.timestamp,
                  updatedAt: v.updatedAt,
                  hidden: Boolean(v.hidden),
                };
            } catch {
              /* ignore */
            }
          })
        );
        if (myId === givenGenRef.current) setGivenVouchStatuses(statusMap);
      } catch {
        if (myId === givenGenRef.current) setTargetsVouchedBy([]);
      } finally {
        if (myId === givenGenRef.current) setLoadingGiven(false);
      }
    };

    run();
  }, [
    normalizedAddress,
    contractPin,
    aggregationKey,
    isUP,
    chainId,
    effectiveChainId,
    isSupported,
  ]);

  return {
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    aggregatedAcceptedCount: isUP ? aggregatedAcceptedCount : null,
    loading,
    loadingGiven,
    error,
    isSupported,
    /** True when viewing a UP with multi-chain aggregation (composite vouch keys). */
    isMultiChainUPAggregate: isUP,
  };
}

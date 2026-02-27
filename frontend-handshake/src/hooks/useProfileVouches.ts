/**
 * Fetches received and given vouches for a profile address via read-only contract.
 * Uses generation ref pattern to avoid stale updates from effect re-runs.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Contract, getAddress, JsonRpcProvider } from "ethers";
import { getHandshakeAddress } from "@/config/contracts";
import { CHAINS } from "@/hooks/useInjectedWallet";
import type { VouchData, VouchStatus } from "@/types/handshake";
// @ts-expect-error - JSON artifact from repo root via Vite alias
import HandshakeArtifact from "@contracts";

export function useProfileVouches(
  address: string | null,
  chainId: number
) {
  const normalizedAddress = useMemo(() => {
    if (!address) return null;
    try {
      return getAddress(address.trim());
    } catch {
      return null;
    }
  }, [address]);

  const contractAddress = getHandshakeAddress(chainId);
  const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;

  const roContract = useMemo(() => {
    if (!contractAddress || !rpc) return null;
    return new Contract(
      contractAddress,
      HandshakeArtifact?.abi ?? [],
      new JsonRpcProvider(rpc)
    );
  }, [contractAddress, rpc]);

  const [vouchersForTarget, setVouchersForTarget] = useState<string[]>([]);
  const [vouchStatuses, setVouchStatuses] = useState<Record<string, VouchData>>({});
  const [targetsVouchedBy, setTargetsVouchedBy] = useState<string[]>([]);
  const [givenVouchStatuses, setGivenVouchStatuses] = useState<Record<string, VouchData>>({});
  const [loading, setLoading] = useState(false);
  const [loadingGiven, setLoadingGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receivedGenRef = useRef(0);
  const givenGenRef = useRef(0);

  useEffect(() => {
    if (!normalizedAddress || !roContract) {
      setVouchersForTarget([]);
      setVouchStatuses({});
      return;
    }

    const myId = ++receivedGenRef.current;
    setLoading(true);
    setError(null);

    roContract
      .getVouchersFor(normalizedAddress)
      .then((vouchers: string[]) => {
        if (myId !== receivedGenRef.current) return;
        setVouchersForTarget(vouchers);

        const statusMap: Record<string, VouchData> = {};
        Promise.all(
          vouchers.map(async (voucher: string) => {
            try {
              const v = await roContract.getVouch(normalizedAddress, voucher);
              if (v)
                statusMap[voucher] = {
                  category: Number(v.category),
                  status: Number(v.status) as VouchStatus,
                  timestamp: v.timestamp,
                  updatedAt: v.updatedAt,
                  hidden: Boolean(v.hidden),
                };
            } catch {
              // ignore
            }
          })
        ).then(() => {
          if (myId === receivedGenRef.current) setVouchStatuses(statusMap);
        });
      })
      .catch((e: unknown) => {
        if (myId === receivedGenRef.current) {
          setError(e instanceof Error ? e.message : "Failed to load vouches");
        }
      })
      .finally(() => {
        if (myId === receivedGenRef.current) setLoading(false);
      });
  }, [normalizedAddress, roContract]);

  useEffect(() => {
    if (!normalizedAddress || !roContract) {
      setTargetsVouchedBy([]);
      setGivenVouchStatuses({});
      return;
    }

    const myId = ++givenGenRef.current;
    setLoadingGiven(true);

    roContract
      .getTargetsVouchedBy(normalizedAddress)
      .then((targets: string[]) => {
        if (myId !== givenGenRef.current) return;
        setTargetsVouchedBy(targets);

        const statusMap: Record<string, VouchData> = {};
        Promise.all(
          targets.map(async (target: string) => {
            try {
              const v = await roContract.getVouch(target, normalizedAddress);
              if (v)
                statusMap[target] = {
                  category: Number(v.category),
                  status: Number(v.status) as VouchStatus,
                  timestamp: v.timestamp,
                  updatedAt: v.updatedAt,
                  hidden: Boolean(v.hidden),
                };
            } catch {
              // ignore
            }
          })
        ).then(() => {
          if (myId === givenGenRef.current) setGivenVouchStatuses(statusMap);
        });
      })
      .catch(() => {
        if (myId === givenGenRef.current) setTargetsVouchedBy([]);
      })
      .finally(() => {
        if (myId === givenGenRef.current) setLoadingGiven(false);
      });
  }, [normalizedAddress, roContract]);

  return {
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    loading,
    loadingGiven,
    error,
    isSupported: !!roContract,
  };
}

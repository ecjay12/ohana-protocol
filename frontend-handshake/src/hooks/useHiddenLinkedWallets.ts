import { useCallback, useMemo, useState, useEffect } from "react";
import { getAddress } from "ethers";
import {
  getHiddenLinkedEoas,
  toggleHiddenLinkedEoa,
} from "@/lib/hiddenLinkedWalletsStorage";

/**
 * Display-only “hide wallet” preferences for a UP (localStorage).
 * Only meaningful when the viewer is the profile owner — pass the resulting Set into
 * buildIdentityVouchStatsForUpProfile.
 */
export function useHiddenLinkedWallets(profileAddress: string | null) {
  const keyLower = useMemo(() => {
    if (!profileAddress) return null;
    try {
      return getAddress(profileAddress).toLowerCase();
    } catch {
      return null;
    }
  }, [profileAddress]);

  const [hiddenLower, setHiddenLower] = useState<string[]>([]);

  useEffect(() => {
    if (!keyLower) {
      setHiddenLower([]);
      return;
    }
    setHiddenLower(getHiddenLinkedEoas(keyLower));
  }, [keyLower]);

  const hiddenSet = useMemo(() => new Set(hiddenLower.map((a) => a.toLowerCase())), [hiddenLower]);

  const refresh = useCallback(() => {
    if (!keyLower) return;
    setHiddenLower(getHiddenLinkedEoas(keyLower));
  }, [keyLower]);

  const setHidden = useCallback(
    (eoa: string, hide: boolean) => {
      if (!keyLower) return;
      try {
        const lo = getAddress(eoa).toLowerCase();
        const next = toggleHiddenLinkedEoa(keyLower, lo, hide);
        setHiddenLower(next);
      } catch {
        /* ignore */
      }
    },
    [keyLower]
  );

  const isHidden = useCallback(
    (eoa: string) => {
      try {
        return hiddenSet.has(getAddress(eoa).toLowerCase());
      } catch {
        return false;
      }
    },
    [hiddenSet]
  );

  return { hiddenLower, hiddenSet, setHidden, isHidden, refresh };
}

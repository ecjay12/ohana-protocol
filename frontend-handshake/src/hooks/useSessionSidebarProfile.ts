/**
 * Session identity for sidebar / nav: show the Universal Profile people care about
 * (linked UP when signed in with an EOA, or LUKSO LSP data when the UP extension is on a non-LUKSO chain).
 */

import { useState, useEffect, useMemo } from "react";
import type { BrowserProvider } from "ethers";
import { useProfileData } from "@/hooks/useProfileData";
import { getUPForEOAOnLuksoFamily } from "@/lib/upEoaLookup";
import type { ProfileData } from "@/lib/lsp4Profile";

const LUKSO_MAIN = 42;
const LUKSO_TEST = 4201;

function luksoProfileChainId(walletChain: number): number {
  return walletChain === LUKSO_TEST ? LUKSO_TEST : LUKSO_MAIN;
}

export interface SessionSidebarProfile {
  /** Address used for ProfileHeader (name, avatar) — usually the UP. */
  headerAddress: string | null;
  headerProfileData: ProfileData | null;
  headerLoading: boolean;
  /** True if the header shows a Universal Profile (vs plain wallet). */
  headerIsUP: boolean;
  /** True if the signing address is a UP on the current chain OR on LUKSO read. */
  signingIsUP: boolean;
  /** True only if the signer is a UP on the wallet’s current chain (e.g. LSP2 reads). */
  signerIsUPOnWalletChain: boolean;
  /** eth_accounts address (the key approving transactions). */
  signingAddress: string | null;
}

export function useSessionSidebarProfile(
  provider: BrowserProvider | null,
  chainId: number,
  account: string | null,
  getUPForEOA: (addr: string) => Promise<string | null>
): SessionSidebarProfile {
  const primary = useProfileData(provider, account, chainId);
  const onLuksoFamily = chainId === LUKSO_MAIN || chainId === LUKSO_TEST;
  const crossChainReadAddress = account && !onLuksoFamily ? account : null;
  const crossChain = useProfileData(
    null,
    crossChainReadAddress,
    luksoProfileChainId(chainId)
  );

  const [linkedUP, setLinkedUP] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setLinkedUP(null);
      return;
    }
    if (primary.loading || crossChain.loading) return;

    const signerIsUp = primary.isUP || Boolean(crossChainReadAddress && crossChain.isUP);
    if (signerIsUp) {
      setLinkedUP(null);
      return;
    }

    let cancelled = false;
    (async () => {
      let up: string | null = null;
      try {
        up = await getUPForEOA(account);
      } catch {
        up = null;
      }
      if (!up) {
        try {
          up = await getUPForEOAOnLuksoFamily(account);
        } catch {
          up = null;
        }
      }
      if (!cancelled) setLinkedUP(up);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    account,
    primary.loading,
    primary.isUP,
    crossChain.loading,
    crossChain.isUP,
    crossChainReadAddress,
    getUPForEOA,
  ]);

  const linkedAddr =
    linkedUP && account && linkedUP.toLowerCase() !== account.toLowerCase() ? linkedUP : null;
  const linkedProfile = useProfileData(null, linkedAddr, luksoProfileChainId(chainId));

  return useMemo(() => {
    if (!account) {
      return {
        headerAddress: null,
        headerProfileData: null,
        headerLoading: false,
        headerIsUP: false,
        signingIsUP: false,
        signerIsUPOnWalletChain: false,
        signingAddress: null,
      };
    }

    if (primary.isUP) {
      return {
        headerAddress: account,
        headerProfileData: primary.profileData,
        headerLoading: primary.loading,
        headerIsUP: true,
        signingIsUP: true,
        signerIsUPOnWalletChain: true,
        signingAddress: account,
      };
    }

    if (crossChainReadAddress && crossChain.isUP) {
      return {
        headerAddress: account,
        headerProfileData: crossChain.profileData,
        headerLoading: primary.loading || crossChain.loading,
        headerIsUP: true,
        signingIsUP: true,
        signerIsUPOnWalletChain: false,
        signingAddress: account,
      };
    }

    if (linkedAddr) {
      return {
        headerAddress: linkedAddr,
        headerProfileData: linkedProfile.profileData,
        headerLoading: primary.loading || crossChain.loading || linkedProfile.loading,
        headerIsUP: true,
        signingIsUP: false,
        signerIsUPOnWalletChain: false,
        signingAddress: account,
      };
    }

    return {
      headerAddress: account,
      headerProfileData: primary.profileData,
      headerLoading: primary.loading,
      headerIsUP: false,
      signingIsUP: false,
      signerIsUPOnWalletChain: false,
      signingAddress: account,
    };
  }, [
    account,
    primary.isUP,
    primary.loading,
    primary.profileData,
    crossChainReadAddress,
    crossChain.isUP,
    crossChain.loading,
    crossChain.profileData,
    linkedAddr,
    linkedProfile.profileData,
    linkedProfile.loading,
  ]);
}

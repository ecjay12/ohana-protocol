/**
 * Hook to fetch and cache profile data (LSP4 + LSP26) for any address.
 * Caches results to avoid repeated fetches.
 * When not connected (provider null), uses a read-only JsonRpcProvider for the profile's chain so data still loads.
 */

import { useState, useEffect, useCallback } from "react";
import { JsonRpcProvider } from "ethers";
import type { BrowserProvider } from "ethers";
import { getProfileData, type ProfileData } from "@/lib/lsp4Profile";
import { isUniversalProfile } from "@/lib/upDetection";
import { CHAINS } from "@/hooks/useInjectedWallet";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<
  string,
  { data: ProfileData | null; isUP: boolean; timestamp: number }
>();

function getCacheKey(address: string, chainId: number): string {
  return `${chainId}:${address.toLowerCase()}`;
}

export function useProfileData(
  provider: BrowserProvider | null,
  address: string | null,
  chainId: number
) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isUP, setIsUP] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfileData(null);
      setIsUP(false);
      setLoading(false);
      return;
    }

    // When viewer is not connected, use read-only RPC for the profile's chain so we can still load LSP data
    let effectiveProvider: BrowserProvider | JsonRpcProvider | null = provider;
    if (!effectiveProvider && chainId) {
      const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
      if (rpc) effectiveProvider = new JsonRpcProvider(rpc);
    }

    if (!effectiveProvider) {
      setProfileData(null);
      setIsUP(false);
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(address, chainId);
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Use cache if valid (skip cache when data is null so we retry and can recover from transient failures)
    if (cached && now - cached.timestamp < CACHE_TTL && cached.data != null) {
      setProfileData(cached.data);
      setIsUP(cached.isUP);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProfileData(effectiveProvider, address);
      setProfileData(data);

      const upStatus = await isUniversalProfile(effectiveProvider, address);
      setIsUP(upStatus);

      // Don't cache null so we retry on next visit (transient fetch failures or late-updated UP can then show)
      if (data != null) {
        cache.set(cacheKey, { data, isUP: upStatus, timestamp: now });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch profile");
      setProfileData(null);
      setIsUP(false);
    } finally {
      setLoading(false);
    }
  }, [provider, address, chainId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profileData, isUP, loading, error, refetch: fetchProfile };
}

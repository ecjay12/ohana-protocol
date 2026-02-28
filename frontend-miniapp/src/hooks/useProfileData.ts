/**
 * Fetch LSP3 profile data (name, avatar) for an address.
 */
import { useState, useEffect, useCallback } from "react";
import { JsonRpcProvider } from "ethers";
import { getProfileData, type ProfileData } from "@/lib/lsp4Profile";
import { CHAINS } from "@/hooks/useInjectedWallet";

export function useProfileData(chainId: number, address: string | null) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!address || !address.trim()) {
      setProfile(null);
      return;
    }
    const rpc = CHAINS[chainId as keyof typeof CHAINS]?.rpc;
    if (!rpc) {
      setError("Unsupported chain");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new JsonRpcProvider(rpc);
      const data = await getProfileData(provider, address.trim());
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [chainId, address]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, error, refetch };
}

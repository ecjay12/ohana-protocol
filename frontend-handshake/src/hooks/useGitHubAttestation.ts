/**
 * Check if an address has a GitHub attestation (e.g. Gitcoin Passport stamp).
 * Reads from our serverless proxy /api/github-attestation?address=0x...
 */
import { useState, useEffect, useCallback } from "react";

export function useGitHubAttestation(address: string | null) {
  const [hasGitHub, setHasGitHub] = useState(false);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!address?.trim()) {
      setHasGitHub(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(
        `${base}/api/github-attestation?address=${encodeURIComponent(address.trim())}`
      );
      const data = await res.json().catch(() => ({ hasGitHub: false }));
      setHasGitHub(Boolean(data?.hasGitHub));
    } catch {
      setHasGitHub(false);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { hasGitHub, loading, refetch };
}

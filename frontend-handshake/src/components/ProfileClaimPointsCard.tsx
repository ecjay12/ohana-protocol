/**
 * Claim Ohana Points snapshot to UP ERC725Y (OhanaPointsV1). LUKSO only; requires indexer DB for accurate totals.
 */
import { useState, useCallback } from "react";
import { Loader2, Award } from "lucide-react";
import type { BrowserProvider } from "ethers";
import { GlowButton } from "@/components/GlowButton";
import { ensureOhanaKeyAllowed, setOhanaPointsV1 } from "@/lib/upHandshake";
import type { OhanaPointsV1Value } from "@/config/lsp2Handshake";
import { useUserPoints } from "@/hooks/useUserPoints";

const LUKSO = new Set([42, 4201]);

async function postClaimRecord(
  up: string,
  blockNumber: bigint | number,
  txHash: string,
  snapshotTotal: string
): Promise<void> {
  const base =
    (import.meta.env.VITE_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const res = await fetch(`${base}/api/points-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      up: up.toLowerCase(),
      lastClaimedBlock: blockNumber.toString(),
      lastClaimTxHash: txHash,
      lastSnapshotTotal: snapshotTotal,
    }),
  });
  if (!res.ok) throw new Error(`Claim record failed: ${res.status}`);
}

interface ProfileClaimPointsCardProps {
  provider: BrowserProvider | null;
  chainId: number;
  upAddress: string;
  isOwnProfile: boolean;
  isUP: boolean;
}

export function ProfileClaimPointsCard({
  provider,
  chainId,
  upAddress,
  isOwnProfile,
  isUP,
}: ProfileClaimPointsCardProps) {
  const { data, loading, error, refetch } = useUserPoints(
    isOwnProfile && isUP ? upAddress : null,
    chainId
  );
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [localError, setLocalError] = useState<string | null>(null);

  const onClaim = useCallback(async () => {
    if (!provider || !data) return;
    if (!LUKSO.has(chainId)) {
      setLocalError("Switch to LUKSO Mainnet or Testnet to write to your Universal Profile.");
      return;
    }
    setLocalError(null);
    setPhase("busy");
    try {
      const signer = await provider.getSigner();
      const allowed = await ensureOhanaKeyAllowed(signer, upAddress);
      if (!allowed.added) {
        setPhase("idle");
        setLocalError(allowed.error ?? "Could not allow Ohana keys.");
        return;
      }

      const payload: OhanaPointsV1Value = {
        totalPointsEver: data.totalPointsEver,
        pendingPoints: data.pendingPoints,
        lastClaimedBlock: data.lastClaimedBlock,
        chainId,
        updatedAt: Math.floor(Date.now() / 1000),
      };
      const receipt = await setOhanaPointsV1(signer, upAddress, payload);
      if (!receipt) {
        setPhase("idle");
        setLocalError("Transaction was not mined.");
        return;
      }
      await postClaimRecord(upAddress, receipt.blockNumber, receipt.hash, data.totalPointsEver);
      setPhase("done");
      refetch();
    } catch (e) {
      setPhase("idle");
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [provider, data, chainId, upAddress, refetch]);

  if (!isOwnProfile || !isUP) return null;

  return (
    <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-accent">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold text-theme-text">Ohana Points</h2>
          {loading && <p className="text-sm text-theme-text-muted">Loading points…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {data && (
            <>
              <p className="text-sm text-theme-text-muted">
                Total (all time): <strong className="text-theme-text">{data.totalPointsEver}</strong>
                {" · "}
                Pending since last claim:{" "}
                <strong className="text-theme-text">{data.pendingPoints}</strong>
              </p>
              {!data.indexed && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{data.message}</p>
              )}
            </>
          )}
          {localError && <p className="text-sm text-red-400">{localError}</p>}
          {phase === "done" && (
            <p className="text-sm text-green-600 dark:text-green-400">Snapshot saved on your UP.</p>
          )}
          {!LUKSO.has(chainId) && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Switch to LUKSO to claim points onto your UP.
            </p>
          )}
          <GlowButton
            type="button"
            className="mt-2 inline-flex items-center gap-2"
            disabled={loading || !data?.indexed || phase === "busy" || !provider}
            onClick={onClaim}
          >
            {phase === "busy" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirm in wallet…
              </>
            ) : (
              "Claim Points to Universal Profile"
            )}
          </GlowButton>
        </div>
      </div>
    </div>
  );
}

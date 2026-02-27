/**
 * Public profile page showing vouches and profile data for any address.
 * Accessible via /profile/:address route.
 */

import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getAddress } from "ethers";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { useGitHubAttestation } from "@/hooks/useGitHubAttestation";
import { ProfileHeader } from "@/components/ProfileHeader";
import { AcceptedVouchesCard } from "@/components/AcceptedVouchesCard";
import {
  ProfileVouchHistoryCard,
  type ProfileVouchRow,
} from "@/components/ProfileVouchHistoryCard";
import { VouchCard } from "@/components/VouchCard";
import { GlowButton } from "@/components/GlowButton";

export function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { provider, chainId, accounts } = useInjectedWallet();
  const account = accounts[0] ?? null;

  const normalizedAddress = useMemo(() => {
    if (!address) return null;
    try {
      return getAddress(address.trim());
    } catch {
      return null;
    }
  }, [address]);

  const { profileData, isUP, loading: profileLoading } = useProfileData(
    provider,
    address || null,
    chainId
  );
  const { hasGitHub: hasGitHubVerified } = useGitHubAttestation(address || null);

  const {
    vouch,
    removeVouch,
    txPending,
    fee,
    isSupported,
  } = useHandshake(provider, chainId, account);

  const { acceptedCount: contractAcceptedCount } = useHandshakeReadOnly(
    chainId,
    normalizedAddress
  );

  const {
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    loading,
    loadingGiven,
    error,
  } = useProfileVouches(address || null, chainId);

  const profileVouchesReceived: ProfileVouchRow[] = useMemo(() => {
    return vouchersForTarget.map((voucher) => {
      const v = vouchStatuses[voucher];
      return {
        type: "received",
        address: voucher,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
      };
    });
  }, [vouchersForTarget, vouchStatuses]);

  const profileVouchesGiven: ProfileVouchRow[] = useMemo(() => {
    return targetsVouchedBy.map((target) => {
      const v = givenVouchStatuses[target];
      return {
        type: "given",
        address: target,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
      };
    });
  }, [targetsVouchedBy, givenVouchStatuses]);

  if (!normalizedAddress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-theme-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6"
        >
          <h2 className="mb-2 text-lg font-semibold text-theme-text">
            Invalid Address
          </h2>
          <p className="mb-4 text-sm text-theme-text-muted">
            The address format is invalid.
          </p>
          <GlowButton onClick={() => navigate("/")}>Go to Dashboard</GlowButton>
        </motion.div>
      </div>
    );
  }

  const isOwnProfile =
    normalizedAddress.toLowerCase() === account?.toLowerCase();
  const feeDisplay = fee ? `${(Number(fee) / 1e18).toFixed(4)} ETH` : "—";

  return (
    <div className="min-h-screen bg-theme-background">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <ProfileHeader
          profileData={profileData}
          address={normalizedAddress}
          isUP={isUP}
          loading={profileLoading}
          isOwnProfile={isOwnProfile}
          hasGitHubVerified={hasGitHubVerified}
          acceptedCount={contractAcceptedCount}
        />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        {!isOwnProfile && account && isSupported && (
          <VouchCard
            feeLabel={feeDisplay}
            categories={CATEGORIES}
            txPending={txPending}
            onVouch={async (target, category) => {
              await vouch(target, category);
            }}
            disabled={false}
            initialAddress={normalizedAddress}
            compact
          />
        )}

        {isSupported && (
          <AcceptedVouchesCard
            vouchersForMe={vouchersForTarget}
            vouchStatuses={vouchStatuses}
            loading={loading}
            categories={CATEGORIES}
            hiddenVouchers={new Set()}
            onHideVouch={undefined}
            onRefresh={() => window.location.reload()}
            disabled={!account || !isOwnProfile}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
            <p className="text-sm text-theme-text-muted">Accepted Vouches</p>
            <p className="text-2xl font-bold text-theme-text">
              {contractAcceptedCount}
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
            <p className="text-sm text-theme-text-muted">Total Vouches</p>
            <p className="text-2xl font-bold text-theme-text">
              {vouchersForTarget.length}
            </p>
          </div>
        </div>

        {isSupported && (
          <ProfileVouchHistoryCard
            vouchesGiven={profileVouchesGiven}
            vouchesReceived={profileVouchesReceived}
            categories={CATEGORIES}
            loading={loading || loadingGiven}
            isConnectedProfile={isOwnProfile}
            onRemoveVouch={
              isOwnProfile && account
                ? async (target: string) => {
                    await removeVouch(target);
                    window.location.reload();
                  }
                : undefined
            }
            txPending={txPending}
            disabled={!account || !isOwnProfile}
          />
        )}
      </div>
    </div>
  );
}

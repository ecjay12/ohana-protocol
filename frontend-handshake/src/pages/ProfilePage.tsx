/**
 * Public profile page showing vouches and profile data for any address.
 * Accessible via /profile/:address route.
 */

import { useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getAddress } from "ethers";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { CHAINS } from "@/hooks/useInjectedWallet";
import {
  parseReceivedVouchKey,
  parseGivenVouchKey,
  displayAddressFromReceivedKey,
  displayAddressFromGivenKey,
} from "@/lib/vouchAggregationKeys";
import { useGitHubAttestation } from "@/hooks/useGitHubAttestation";
import { ProfileHeader } from "@/components/ProfileHeader";
import { AcceptedVouchesCard } from "@/components/AcceptedVouchesCard";
import {
  ProfileVouchHistoryCard,
  type ProfileVouchRow,
} from "@/components/ProfileVouchHistoryCard";
import { VouchCard } from "@/components/VouchCard";
import { GlowButton } from "@/components/GlowButton";
import { ProfileVouchGraphSection } from "@/components/ProfileVouchGraphSection";
import { ProfileHandshakeGridCard } from "@/components/ProfileHandshakeGridCard";
import { ProfileIdentityComingSoonCard } from "@/components/ProfileIdentityComingSoonCard";
import { AppLayout } from "@/layout/AppLayout";

export function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const {
    provider,
    chainId,
    accounts,
    chains,
    connect,
    connectWith,
    disconnect,
    switchChain,
    isConnected,
    hasInjected,
    availableWallets,
    error: walletError,
  } = useInjectedWallet();
  const account = accounts[0] ?? null;
  const shortAddr = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "";

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
  const { profileData: navProfileData, isUP: navIsUP, loading: navProfileLoading } =
    useProfileData(provider, account, chainId);
  const { hasGitHub: hasGitHubVerified } = useGitHubAttestation(address || null);

  const {
    vouch,
    removeVouch,
    hideVouch,
    unhideVouch,
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
    aggregatedAcceptedCount,
    loading,
    loadingGiven,
    error,
    isMultiChainUPAggregate,
  } = useProfileVouches(address || null, chainId, isUP);

  const displayAcceptedCount =
    isUP && aggregatedAcceptedCount != null ? aggregatedAcceptedCount : contractAcceptedCount;

  const isOwnProfile =
    normalizedAddress?.toLowerCase() === account?.toLowerCase();

  const profileVouchesReceived: ProfileVouchRow[] = useMemo(() => {
    const rows = vouchersForTarget.map((key) => {
      const v = vouchStatuses[key];
      const parsed = parseReceivedVouchKey(key);
      const displayAddr = displayAddressFromReceivedKey(key);
      const chainIdRow = parsed?.chainId;
      return {
        type: "received" as const,
        address: displayAddr,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
        hidden: v?.hidden ?? false,
        chainId: chainIdRow,
        chainLabel:
          chainIdRow != null
            ? CHAINS[chainIdRow as keyof typeof CHAINS]?.name
            : undefined,
        vouchKey: isMultiChainUPAggregate ? key : undefined,
      };
    });
    // Public view: exclude hidden entirely
    if (!isOwnProfile) {
      return rows.filter((r) => !r.hidden);
    }
    return rows;
  }, [vouchersForTarget, vouchStatuses, isOwnProfile, isMultiChainUPAggregate]);

  const profileVouchesGiven: ProfileVouchRow[] = useMemo(() => {
    return targetsVouchedBy.map((key) => {
      const v = givenVouchStatuses[key];
      const parsed = parseGivenVouchKey(key);
      const displayAddr = displayAddressFromGivenKey(key);
      const chainIdRow = parsed?.chainId;
      return {
        type: "given" as const,
        address: displayAddr,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
        chainId: chainIdRow,
        chainLabel:
          chainIdRow != null
            ? CHAINS[chainIdRow as keyof typeof CHAINS]?.name
            : undefined,
        vouchKey: isMultiChainUPAggregate ? key : undefined,
      };
    });
  }, [targetsVouchedBy, givenVouchStatuses, isMultiChainUPAggregate]);

  const totalVouchesReceived = useMemo(
    () =>
      isOwnProfile
        ? vouchersForTarget.length
        : vouchersForTarget.filter((k) => !vouchStatuses[k]?.hidden).length,
    [isOwnProfile, vouchersForTarget, vouchStatuses]
  );

  const totalVouchesGiven = useMemo(
    () => targetsVouchedBy.length,
    [targetsVouchedBy]
  );

  const handleHideVouch = useCallback(
    async (keyOrVoucher: string) => {
      if (!account || !provider) return;
      const parsed = parseReceivedVouchKey(keyOrVoucher);
      const voucherAddr = parsed?.voucher ?? keyOrVoucher;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Switch your wallet to ${name} to hide this vouch.`);
        return;
      }
      try {
        await hideVouch(voucherAddr);
        window.location.reload();
      } catch (e) {
        console.error("Failed to hide vouch:", e);
      }
    },
    [account, provider, hideVouch, chainId]
  );

  const handleUnhideVouch = useCallback(
    async (keyOrVoucher: string) => {
      if (!account || !provider) return;
      const parsed = parseReceivedVouchKey(keyOrVoucher);
      const voucherAddr = parsed?.voucher ?? keyOrVoucher;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Switch your wallet to ${name} to unhide this vouch.`);
        return;
      }
      try {
        await unhideVouch(voucherAddr);
        window.location.reload();
      } catch (e) {
        console.error("Failed to unhide vouch:", e);
      }
    },
    [account, provider, unhideVouch, chainId]
  );

  const handleRemoveGivenVouch = useCallback(
    async (keyOrTarget: string) => {
      if (!account || !provider) return;
      const parsed = parseGivenVouchKey(keyOrTarget);
      const targetAddr = parsed?.target ?? keyOrTarget;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Switch your wallet to ${name} to revoke this vouch.`);
        return;
      }
      try {
        await removeVouch(targetAddr);
        window.location.reload();
      } catch (e) {
        console.error("Failed to remove vouch:", e);
      }
    },
    [account, provider, removeVouch, chainId]
  );

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
          <GlowButton onClick={() => navigate("/app")}>Go to App</GlowButton>
        </motion.div>
      </div>
    );
  }

  const feeDisplay = fee ? `${(Number(fee) / 1e18).toFixed(4)} ETH` : "—";

  return (
    <AppLayout
      chainId={chainId}
      chains={chains as Record<number, { name: string; rpc: string }>}
      shortAddress={shortAddr}
      account={account ?? undefined}
      isConnected={isConnected}
      hasInjected={hasInjected}
      availableWallets={availableWallets}
      walletError={walletError}
      userProfileData={navProfileData}
      userProfileLoading={navProfileLoading}
      userIsUP={navIsUP}
      onConnect={connect}
      onConnectWith={connectWith}
      onSwitchChain={switchChain}
      onDisconnect={disconnect}
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:space-y-8 sm:px-6 sm:py-10 md:px-8 md:py-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <ProfileHeader
          profileData={profileData}
          address={normalizedAddress}
          isUP={isUP}
          loading={profileLoading}
          isOwnProfile={isOwnProfile}
          hasGitHubVerified={hasGitHubVerified}
          acceptedCount={displayAcceptedCount}
        />

        {isUP && isMultiChainUPAggregate && (
          <p className="text-xs leading-relaxed text-theme-text-muted">
            Vouches aggregate across chains where Handshake is deployed (e.g. LUKSO and Base). Link
            each MetaMask / EOA wallet to this UP{" "}
            <strong className="font-medium text-theme-text">once on LUKSO</strong> — then activity on
            Base and elsewhere using that wallet appears here.{" "}
            <Link to="/up-identity" className="text-theme-accent hover:underline">
              EOA → UP linking
            </Link>
          </p>
        )}

        <ProfileVouchGraphSection
          profileAddress={normalizedAddress}
          chainId={chainId}
          isUP={isUP}
        />

        {isOwnProfile && (
          <>
            <ProfileHandshakeGridCard
              provider={provider}
              chainId={chainId}
              upAddress={normalizedAddress}
              isOwnProfile={isOwnProfile}
              isUP={isUP}
              acceptedCount={Number(displayAcceptedCount ?? 0)}
            />
            <ProfileIdentityComingSoonCard />
          </>
        )}

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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
            <p className="text-sm text-theme-text-muted">Accepted Vouches</p>
            <p className="text-2xl font-bold text-theme-text">
              {displayAcceptedCount}
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
            <p className="text-sm text-theme-text-muted">Total vouches received</p>
            <p className="text-2xl font-bold text-theme-text">
              {totalVouchesReceived}
            </p>
          </div>
          <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
            <p className="text-sm text-theme-text-muted">Total vouches given</p>
            <p className="text-2xl font-bold text-theme-text">
              {totalVouchesGiven}
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
              isOwnProfile && account ? handleRemoveGivenVouch : undefined
            }
            onHideVouch={isOwnProfile && account ? handleHideVouch : undefined}
            onUnhideVouch={isOwnProfile && account ? handleUnhideVouch : undefined}
            txPending={txPending}
            disabled={!account || !isOwnProfile}
          />
        )}
      </div>
    </AppLayout>
  );
}

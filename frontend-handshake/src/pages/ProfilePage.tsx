/**
 * Public profile page showing vouches and profile data for any address.
 * Accessible via /profile/:address route.
 */

import { useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getAddress } from "ethers";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useProfileData } from "@/hooks/useProfileData";
import { useSessionSidebarProfile } from "@/hooks/useSessionSidebarProfile";
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { CHAINS } from "@/hooks/useInjectedWallet";
import {
  parseReceivedVouchKey,
  parseGivenVouchKey,
  displayAddressFromReceivedKey,
  displayAddressFromGivenKey,
} from "@/lib/vouchAggregationKeys";
import { buildIdentityVouchStatsForUpProfile } from "@/lib/profileWalletVouchStats";
import {
  useProfileNamesForAddresses,
  getGraphProfileNameLookupChainIds,
} from "@/hooks/useProfileNamesForAddresses";
import { useGitHubAttestation } from "@/hooks/useGitHubAttestation";
import { ProfileHeader } from "@/components/ProfileHeader";
import type { ProfileVouchRow } from "@/components/ProfileVouchHistoryCard";
import { ProfileHandshakeGridCard } from "@/components/ProfileHandshakeGridCard";
import { UpIdentityWalletDashboard } from "@/components/UpIdentityWalletDashboard";
import { GlowButton } from "@/components/GlowButton";
import { AppLayout } from "@/layout/AppLayout";

const ProfileVouchGraphSection = lazy(() =>
  import("@/components/ProfileVouchGraphSection").then((m) => ({ default: m.ProfileVouchGraphSection }))
);
const AcceptedVouchesCard = lazy(() =>
  import("@/components/AcceptedVouchesCard").then((m) => ({ default: m.AcceptedVouchesCard }))
);
const ProfileVouchHistoryCard = lazy(() =>
  import("@/components/ProfileVouchHistoryCard").then((m) => ({ default: m.ProfileVouchHistoryCard }))
);
const VouchCard = lazy(() => import("@/components/VouchCard").then((m) => ({ default: m.VouchCard })));
const ProfileLinkWalletsSection = lazy(() =>
  import("@/components/ProfileLinkWalletsSection").then((m) => ({ default: m.ProfileLinkWalletsSection }))
);

const LUKSO_MAIN = 42;
const LUKSO_TEST = 4201;

function luksoProfileChainIdForWallet(walletChain: number): number {
  return walletChain === LUKSO_TEST ? LUKSO_TEST : LUKSO_MAIN;
}

function ProfileSectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-theme-border bg-theme-surface/50 ${className ?? "min-h-32"}`}
      aria-hidden
    />
  );
}

export function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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

  /** URL param profile on the wallet’s chain (may miss UP bytecode off-LUKSO). */
  const { profileData, isUP, loading: profileLoading } = useProfileData(
    provider,
    normalizedAddress,
    chainId
  );
  const onLuksoFamily = chainId === LUKSO_MAIN || chainId === LUKSO_TEST;
  const profileUrlCrossReadAddress =
    normalizedAddress && !onLuksoFamily ? normalizedAddress : null;
  const profileUrlOnLukso = useProfileData(
    null,
    profileUrlCrossReadAddress,
    luksoProfileChainIdForWallet(chainId)
  );
  /** True when the profile URL is a Universal Profile (current chain or LUKSO read). */
  const urlIdentityIsUP = isUP || Boolean(profileUrlCrossReadAddress && profileUrlOnLukso.isUP);

  const { hasGitHub: hasGitHubVerified } = useGitHubAttestation(address || null);

  const {
    vouch,
    acceptVouch,
    denyVouch,
    removeVouch,
    hideVouch,
    unhideVouch,
    txPending,
    fee,
    isSupported,
    error: handshakeError,
    getUPForEOA,
  } = useHandshake(provider, chainId, account);

  const sidebarSession = useSessionSidebarProfile(provider, chainId, account, getUPForEOA);
  const navProfileData = sidebarSession.headerProfileData;
  const navProfileLoading = sidebarSession.headerLoading;
  const navIsUP = sidebarSession.headerIsUP;

  const { acceptedCount: contractAcceptedCount } = useHandshakeReadOnly(
    chainId,
    normalizedAddress
  );

  const isOwnProfile =
    normalizedAddress != null &&
    account != null &&
    (normalizedAddress.toLowerCase() === account.toLowerCase() ||
      Boolean(
        sidebarSession.headerAddress &&
          normalizedAddress.toLowerCase() === sidebarSession.headerAddress.toLowerCase()
      ));

  /** While LSP metadata loads, `isUP` can be false briefly; treat as UP when wallet + URL are the same UP. */
  const aggregateAsUP = useMemo(
    () =>
      urlIdentityIsUP ||
      Boolean(
        isOwnProfile &&
          account &&
          normalizedAddress &&
          account.toLowerCase() === normalizedAddress.toLowerCase() &&
          sidebarSession.signingIsUP
      ),
    [urlIdentityIsUP, isOwnProfile, account, normalizedAddress, sidebarSession.signingIsUP]
  );

  /** Merge session LSP into the big header only when the URL is the same identity as the sidebar (not /eoa while session shows linked UP). */
  const ownProfileHeaderUsesSessionLsp = useMemo(
    () =>
      Boolean(
        isOwnProfile &&
          sidebarSession.headerAddress &&
          normalizedAddress &&
          normalizedAddress.toLowerCase() === sidebarSession.headerAddress.toLowerCase()
      ),
    [isOwnProfile, normalizedAddress, sidebarSession.headerAddress]
  );

  const headerProfileData = useMemo(() => {
    if (isOwnProfile && ownProfileHeaderUsesSessionLsp) {
      return navProfileData ?? profileData ?? profileUrlOnLukso.profileData;
    }
    if (isOwnProfile) {
      return profileData ?? profileUrlOnLukso.profileData;
    }
    if (urlIdentityIsUP && profileUrlOnLukso.profileData) {
      return profileUrlOnLukso.profileData ?? profileData;
    }
    return profileData;
  }, [
    isOwnProfile,
    ownProfileHeaderUsesSessionLsp,
    navProfileData,
    profileData,
    profileUrlOnLukso.profileData,
    urlIdentityIsUP,
  ]);

  const headerIsUP = useMemo(
    () =>
      (isOwnProfile && ownProfileHeaderUsesSessionLsp ? navIsUP || urlIdentityIsUP : urlIdentityIsUP),
    [isOwnProfile, ownProfileHeaderUsesSessionLsp, navIsUP, urlIdentityIsUP]
  );

  const headerLoading = useMemo(
    () =>
      isOwnProfile && ownProfileHeaderUsesSessionLsp
        ? !(navProfileData || profileData || profileUrlOnLukso.profileData) &&
            (navProfileLoading || profileLoading || profileUrlOnLukso.loading)
        : !headerProfileData &&
            (profileLoading || Boolean(profileUrlCrossReadAddress && profileUrlOnLukso.loading)),
    [
      isOwnProfile,
      ownProfileHeaderUsesSessionLsp,
      navProfileData,
      profileData,
      profileUrlOnLukso.profileData,
      profileUrlOnLukso.loading,
      navProfileLoading,
      profileLoading,
      profileUrlCrossReadAddress,
      headerProfileData,
    ]
  );

  useEffect(() => {
    if (location.hash !== "#link-wallets") return;
    const scroll = () => {
      document.getElementById("link-wallets")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    scroll();
    const t1 = window.setTimeout(scroll, 100);
    const t2 = window.setTimeout(scroll, 500);
    const t3 = window.setTimeout(scroll, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [location.hash, location.pathname, isOwnProfile, urlIdentityIsUP]);

  const {
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    aggregatedAcceptedCount,
    linkedEOAs,
    loading,
    loadingGiven,
    error,
    isMultiChainUPAggregate,
  } = useProfileVouches(address || null, chainId, aggregateAsUP);

  const identityVouchStatsFull = useMemo(
    () =>
      buildIdentityVouchStatsForUpProfile(
        aggregateAsUP,
        normalizedAddress,
        linkedEOAs,
        vouchersForTarget,
        vouchStatuses,
        targetsVouchedBy,
        givenVouchStatuses,
        account,
        isOwnProfile
      ),
    [
      aggregateAsUP,
      normalizedAddress,
      linkedEOAs,
      vouchersForTarget,
      vouchStatuses,
      targetsVouchedBy,
      givenVouchStatuses,
      isOwnProfile,
      account,
    ]
  );

  const identityVouchStats = useMemo(
    () => identityVouchStatsFull,
    [identityVouchStatsFull]
  );

  const nameLookupAddresses = useMemo(() => {
    const ids = new Set<string>();
    identityVouchStatsFull?.forEach((row) => ids.add(row.address));
    if (account) ids.add(account);
    return [...ids];
  }, [identityVouchStatsFull, account]);

  const namesByAddress = useProfileNamesForAddresses(nameLookupAddresses, chainId, {
    chainIdsForLookup: getGraphProfileNameLookupChainIds(chainId),
  });

  const upProfileLabel =
    headerProfileData?.name?.trim() ||
    (normalizedAddress
      ? `${normalizedAddress.slice(0, 6)}…${normalizedAddress.slice(-4)}`
      : "");

  const sessionWalletLabel =
    (account && namesByAddress[account.toLowerCase()]) ||
    (account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "");

  const displayAcceptedCount =
    aggregateAsUP && aggregatedAcceptedCount != null ? aggregatedAcceptedCount : contractAcceptedCount;

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
        window.alert(`Please switch your wallet to ${name} in MetaMask (or your wallet), then try again.`);
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
        window.alert(`Please switch your wallet to ${name}, then try again.`);
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

  const handleAcceptVouch = useCallback(
    async (keyOrVoucher: string) => {
      if (!account || !provider) return;
      const parsed = parseReceivedVouchKey(keyOrVoucher);
      const voucherAddr = parsed?.voucher ?? keyOrVoucher;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Please switch your wallet to ${name}, then try accepting the vouch again.`);
        return;
      }
      try {
        await acceptVouch(voucherAddr);
        window.location.reload();
      } catch (e) {
        console.error("Failed to accept vouch:", e);
      }
    },
    [account, provider, acceptVouch, chainId]
  );

  const handleDenyVouch = useCallback(
    async (keyOrVoucher: string) => {
      if (!account || !provider) return;
      const parsed = parseReceivedVouchKey(keyOrVoucher);
      const voucherAddr = parsed?.voucher ?? keyOrVoucher;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Please switch your wallet to ${name}, then try denying the vouch again.`);
        return;
      }
      try {
        await denyVouch(voucherAddr);
        window.location.reload();
      } catch (e) {
        console.error("Failed to deny vouch:", e);
      }
    },
    [account, provider, denyVouch, chainId]
  );

  const handleRemoveGivenVouch = useCallback(
    async (keyOrTarget: string) => {
      if (!account || !provider) return;
      const parsed = parseGivenVouchKey(keyOrTarget);
      const targetAddr = parsed?.target ?? keyOrTarget;
      if (parsed && parsed.chainId !== chainId) {
        const name = CHAINS[parsed.chainId as keyof typeof CHAINS]?.name ?? "the correct network";
        window.alert(`Please switch your wallet to ${name}, then try removing the vouch again.`);
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
            We couldn&apos;t read this link
          </h2>
          <p className="mb-4 text-sm text-theme-text-muted">
            The profile link doesn&apos;t look like a valid wallet address. Check the URL for typos,
            or open your profile from the app after you connect.
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
      profileHeaderAddress={sidebarSession.headerAddress ?? undefined}
      userIsUP={sidebarSession.signerIsUPOnWalletChain}
      onConnect={connect}
      onConnectWith={connectWith}
      onSwitchChain={switchChain}
      onDisconnect={disconnect}
    >
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-5 sm:py-10 md:px-8 md:py-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <ProfileHeader
          profileData={headerProfileData}
          address={normalizedAddress}
          isUP={headerIsUP}
          loading={headerLoading}
          isOwnProfile={isOwnProfile}
          hasGitHubVerified={hasGitHubVerified}
          acceptedCount={displayAcceptedCount}
        />

        {!isOwnProfile && account && isSupported && (
          <Suspense fallback={<ProfileSectionSkeleton className="min-h-48" />}>
            <VouchCard
              key={normalizedAddress}
              feeLabel={feeDisplay}
              categories={CATEGORIES}
              txPending={txPending}
              onVouch={async (target, category) => {
                await vouch(target, category);
              }}
              disabled={false}
              initialAddress={normalizedAddress}
              compact
              errorMessage={handshakeError}
            />
          </Suspense>
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
          <Suspense fallback={<ProfileSectionSkeleton className="min-h-56" />}>
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
              onAcceptVouch={isOwnProfile && account ? handleAcceptVouch : undefined}
              onDenyVouch={isOwnProfile && account ? handleDenyVouch : undefined}
              txPending={txPending}
              disabled={!account || !isOwnProfile}
            />
          </Suspense>
        )}

        {aggregateAsUP && account && (
          <UpIdentityWalletDashboard
            variant={navIsUP && isOwnProfile ? "up" : "eoa"}
            navIsUP={sidebarSession.signerIsUPOnWalletChain}
            targetProfileAddress={normalizedAddress}
            account={account}
            sessionWalletLabel={sessionWalletLabel}
            upProfileLabel={upProfileLabel}
            namesByAddress={namesByAddress}
            identityVisible={identityVouchStats}
            identityFull={identityVouchStatsFull}
            statsLoading={loading}
            vouchersForTarget={vouchersForTarget}
            targetsVouchedBy={targetsVouchedBy}
            viewerIsProfileOwner={isOwnProfile}
            hiddenSet={new Set<string>()}
            setHidden={() => {
              /* hide controls disabled on profile page */
            }}
            showVisibilityControls={false}
          />
        )}

        {(isOwnProfile || urlIdentityIsUP) && (
          <div id="link-wallets" className="scroll-mt-24">
            <Suspense fallback={<ProfileSectionSkeleton className="min-h-40" />}>
              <ProfileLinkWalletsSection
                profileAddress={normalizedAddress}
                isOwnProfile={isOwnProfile}
                isProfileUP={aggregateAsUP}
                identityVouchStats={aggregateAsUP ? identityVouchStats : undefined}
                identityVouchStatsLoading={aggregateAsUP && loading}
                hideLinkedWalletStatsCard={aggregateAsUP}
                disableOnChainUnlink={aggregateAsUP}
                hideControlMessaging={false}
                minimalLinkUi
              />

            </Suspense>
          </div>
        )}

        <Suspense fallback={<ProfileSectionSkeleton className="min-h-[min(420px,55vh)]" />}>
          <ProfileVouchGraphSection
            profileAddress={normalizedAddress}
            chainId={chainId}
            isUP={aggregateAsUP}
          />
        </Suspense>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        {isSupported && (
          <Suspense fallback={<ProfileSectionSkeleton className="min-h-36" />}>
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
          </Suspense>
        )}

        {isOwnProfile && (
          <ProfileHandshakeGridCard
            provider={provider}
            chainId={chainId}
            upAddress={normalizedAddress}
            isOwnProfile={isOwnProfile}
            isUP={urlIdentityIsUP}
            acceptedCount={Number(displayAcceptedCount ?? 0)}
          />
        )}
      </div>
    </AppLayout>
  );
}

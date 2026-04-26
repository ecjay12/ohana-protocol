/**
 * Wallets & Universal Profile — plain-language hub for linking wallet logins to one public profile.
 */
import { useMemo, useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { getAddress } from "ethers";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshake } from "@/hooks/useHandshake";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { getUPForEOAOnLuksoFamily } from "@/lib/upEoaLookup";
import { buildIdentityVouchStatsForUpProfile } from "@/lib/profileWalletVouchStats";
import { useHiddenLinkedWallets } from "@/hooks/useHiddenLinkedWallets";
import {
  useProfileNamesForAddresses,
  getGraphProfileNameLookupChainIds,
} from "@/hooks/useProfileNamesForAddresses";
import { useWalletDisplayLabel } from "@/hooks/useWalletDisplayLabel";
import { labelTextClass } from "@/lib/upDisplayLabel";
import { AppLayout } from "@/layout/AppLayout";
import { GlowButton } from "@/components/GlowButton";
import { UpIdentityWalletDashboard } from "@/components/UpIdentityWalletDashboard";

const ProfileLinkWalletsSection = lazy(() =>
  import("@/components/ProfileLinkWalletsSection").then((m) => ({ default: m.ProfileLinkWalletsSection }))
);
function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-theme-border bg-theme-surface/50 ${className ?? "min-h-40"}`}
      aria-hidden
    />
  );
}

export function UpIdentityPage() {
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
  const shortAddr = useWalletDisplayLabel(account);

  const { getUPForEOA } = useHandshake(provider, chainId, account);
  const [linkedUP, setLinkedUP] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setLinkedUP(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let up = await getUPForEOA(account);
      if (cancelled) return;
      if (!up) {
        up = await getUPForEOAOnLuksoFamily(account);
      }
      if (!cancelled) setLinkedUP(up);
    })().catch(() => {
      if (!cancelled) setLinkedUP(null);
    });
    return () => {
      cancelled = true;
    };
  }, [account, getUPForEOA]);

  const targetProfileAddress = useMemo(() => {
    if (!account) return null;
    const primary = linkedUP ?? account;
    try {
      return getAddress(primary);
    } catch {
      return null;
    }
  }, [account, linkedUP]);

  const { profileData: navProfileData, isUP: navIsUP, loading: navProfileLoading } = useProfileData(
    provider,
    account,
    chainId
  );

  const {
    isUP: profileIsUP,
    loading: profileLoading,
    profileData: targetProfileMeta,
  } = useProfileData(provider, targetProfileAddress, chainId);

  /** Match multi-chain aggregation when LSP is slow, or EOA→UP target is known from registry. */
  const treatTargetAsUP = useMemo(() => {
    if (!targetProfileAddress) return false;
    if (profileIsUP) return true;
    if (linkedUP && linkedUP.toLowerCase() === targetProfileAddress.toLowerCase()) return true;
    if (
      account &&
      targetProfileAddress.toLowerCase() === account.toLowerCase() &&
      navIsUP
    ) {
      return true;
    }
    return false;
  }, [targetProfileAddress, profileIsUP, linkedUP, account, navIsUP]);

  const {
    vouchersForTarget,
    vouchStatuses,
    targetsVouchedBy,
    givenVouchStatuses,
    linkedEOAs,
    loading,
  } = useProfileVouches(targetProfileAddress, chainId, treatTargetAsUP);

  const viewerIsProfileOwner =
    !!account &&
    !!targetProfileAddress &&
    (targetProfileAddress.toLowerCase() === account.toLowerCase() ||
      (!!linkedUP && targetProfileAddress.toLowerCase() === linkedUP.toLowerCase()));

  const { hiddenSet, setHidden } = useHiddenLinkedWallets(targetProfileAddress);

  const identityVouchStatsFull = useMemo(
    () =>
      buildIdentityVouchStatsForUpProfile(
        treatTargetAsUP,
        targetProfileAddress,
        linkedEOAs,
        vouchersForTarget,
        vouchStatuses,
        targetsVouchedBy,
        givenVouchStatuses,
        account,
        viewerIsProfileOwner
      ),
    [
      treatTargetAsUP,
      targetProfileAddress,
      linkedEOAs,
      vouchersForTarget,
      vouchStatuses,
      targetsVouchedBy,
      givenVouchStatuses,
      account,
      viewerIsProfileOwner,
    ]
  );

  const identityVouchStats = useMemo(
    () =>
      buildIdentityVouchStatsForUpProfile(
        treatTargetAsUP,
        targetProfileAddress,
        linkedEOAs,
        vouchersForTarget,
        vouchStatuses,
        targetsVouchedBy,
        givenVouchStatuses,
        account,
        viewerIsProfileOwner,
        viewerIsProfileOwner ? { hiddenIdentityLowerSet: hiddenSet } : undefined
      ),
    [
      treatTargetAsUP,
      targetProfileAddress,
      linkedEOAs,
      vouchersForTarget,
      vouchStatuses,
      targetsVouchedBy,
      givenVouchStatuses,
      account,
      viewerIsProfileOwner,
      hiddenSet,
    ]
  );

  const nameLookupAddresses = useMemo(() => {
    const ids = new Set<string>();
    identityVouchStatsFull?.forEach((r) => ids.add(r.address));
    if (account) ids.add(account);
    return [...ids];
  }, [identityVouchStatsFull, account]);

  const namesByAddress = useProfileNamesForAddresses(nameLookupAddresses, chainId, {
    chainIdsForLookup: getGraphProfileNameLookupChainIds(chainId),
  });

  const upProfileLabel =
    targetProfileMeta?.name?.trim() ||
    (targetProfileAddress
      ? `${targetProfileAddress.slice(0, 6)}…${targetProfileAddress.slice(-4)}`
      : "");

  const sessionWalletLabel =
    (account && namesByAddress[account.toLowerCase()]) ||
    (account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "");

  if (!account) {
    return (
      <AppLayout
        chainId={chainId}
        chains={chains as Record<number, { name: string; rpc: string }>}
        shortAddress=""
        account={undefined}
        isConnected={false}
        hasInjected={hasInjected}
        availableWallets={availableWallets}
        walletError={walletError}
        userProfileData={null}
        userProfileLoading={false}
        userIsUP={false}
        onConnect={connect}
        onConnectWith={connectWith}
        onSwitchChain={switchChain}
        onDisconnect={disconnect}
      >
        <div className="mx-auto max-w-lg space-y-8 px-4 py-12 sm:py-16">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-theme-text sm:text-3xl">
              Connect a wallet first
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-theme-text-muted">
              This page helps you tie the wallets you use to <strong className="text-theme-text">one public profile</strong> so
              endorsements show in one place. Start by connecting the wallet you use here.
            </p>
          </div>
          <ol className="space-y-4 text-sm text-theme-text-muted">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme-accent-soft text-xs font-bold text-theme-accent">
                1
              </span>
              <span>
                <strong className="text-theme-text">Install a wallet</strong> if you don’t have one (for example MetaMask or the Universal Profile app).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme-accent-soft text-xs font-bold text-theme-accent">
                2
              </span>
              <span>
                <strong className="text-theme-text">Click Connect</strong> below and choose your wallet. Approve the connection prompt.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme-accent-soft text-xs font-bold text-theme-accent">
                3
              </span>
              <span>
                <strong className="text-theme-text">Come back to this page</strong> — you’ll see which logins are tied to your profile and you can add or hide them from view.
              </span>
            </li>
          </ol>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {availableWallets.length > 1 ? (
              availableWallets.map((w) => (
                <GlowButton key={w.label} onClick={() => connectWith(w)} className="inline-flex justify-center">
                  Connect {w.label}
                </GlowButton>
              ))
            ) : (
              <GlowButton onClick={connect} disabled={!hasInjected} className="inline-flex justify-center">
                {hasInjected ? "Connect wallet" : "No wallet found — install MetaMask or the Universal Profile app, then try again"}
              </GlowButton>
            )}
          </div>
          <p className="text-xs text-theme-text-dim">
            Already connected in another tab? Refresh after unlocking your wallet.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!targetProfileAddress) {
    return (
      <AppLayout
        chainId={chainId}
        chains={chains as Record<number, { name: string; rpc: string }>}
        shortAddress={shortAddr}
        account={account}
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
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-theme-text-muted">
          Could not resolve a profile address from your wallet.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      chainId={chainId}
      chains={chains as Record<number, { name: string; rpc: string }>}
      shortAddress={shortAddr}
      account={account}
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
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-5 sm:py-10 md:px-8 md:py-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-2xl border border-theme-border bg-theme-surface p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-theme-accent" />
            <h1 className="text-xl font-bold tracking-tight text-theme-text sm:text-2xl">
              Wallets &amp; your profile
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-theme-text-muted">
            Add every wallet you use so <strong className="text-theme-text">endorsements</strong> (vouches) from
            those addresses show under <strong className="text-theme-text">one public profile</strong>. You
            approve new links in your wallet on LUKSO.
          </p>
          {linkedUP && account.toLowerCase() !== linkedUP.toLowerCase() && (
            <p className="flex flex-wrap items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-sm text-theme-text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>
                Your main profile for this session:{" "}
                <Link
                  to={`/profile/${linkedUP}#link-wallets`}
                  className="break-all font-mono text-xs text-theme-accent hover:underline sm:text-sm"
                >
                  {linkedUP}
                </Link>
                . You&apos;re signed in with{" "}
                <span className={`text-theme-text ${labelTextClass(shortAddr)}`}>{shortAddr}</span>.
              </span>
            </p>
          )}
        </motion.div>

        {navIsUP && viewerIsProfileOwner && (
          <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950/90 dark:text-amber-100/95">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <p>
              <strong className="font-semibold text-amber-950 dark:text-white">You’re connected as your profile.</strong>{" "}
              To attach another wallet, switch your wallet to that normal account, connect here, then use{" "}
              <strong className="font-semibold">Add another wallet</strong> below (on LUKSO). The link transaction
              must be signed by each wallet you add.
            </p>
          </div>
        )}

        {treatTargetAsUP && (
          <UpIdentityWalletDashboard
            variant={navIsUP ? "up" : "eoa"}
            navIsUP={navIsUP}
            targetProfileAddress={targetProfileAddress}
            account={account}
            sessionWalletLabel={sessionWalletLabel}
            upProfileLabel={upProfileLabel}
            namesByAddress={namesByAddress}
            identityVisible={identityVouchStats}
            identityFull={identityVouchStatsFull}
            statsLoading={loading}
            vouchersForTarget={vouchersForTarget}
            targetsVouchedBy={targetsVouchedBy}
            viewerIsProfileOwner={viewerIsProfileOwner}
            hiddenSet={hiddenSet}
            setHidden={setHidden}
          />
        )}

        <div id="link-wallets" className="scroll-mt-24">
          <Suspense fallback={<SectionSkeleton className="min-h-48" />}>
            <ProfileLinkWalletsSection
              profileAddress={targetProfileAddress}
              isOwnProfile={viewerIsProfileOwner}
              isProfileUP={treatTargetAsUP}
              identityVouchStats={treatTargetAsUP ? identityVouchStats : undefined}
              identityVouchStatsLoading={treatTargetAsUP && loading}
              showConnectedInBrowserBanner={false}
              plainLanguage
              hideLinkedWalletStatsCard={treatTargetAsUP}
              disableOnChainUnlink={treatTargetAsUP}
            />

          </Suspense>
        </div>

        {viewerIsProfileOwner && account && (
          <div className="rounded-2xl border-2 border-theme-accent/70 bg-theme-accent-soft px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-theme-accent">
              Wallet you&apos;re using
            </p>
            <p className="mt-2 select-all break-all font-mono text-sm leading-relaxed text-theme-text sm:text-base">
              {account}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/profile/${targetProfileAddress}#link-wallets`}
            className="inline-flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface-strong px-4 py-2 text-sm font-medium text-theme-text transition-colors hover:border-theme-accent hover:text-theme-accent"
          >
            Open same view on profile URL →
          </Link>
        </div>

        {!profileLoading && !treatTargetAsUP && (
          <p className="text-center text-xs text-theme-text-dim">
            This address isn&apos;t showing as a main profile contract yet. Try linking it below on LUKSO, or
            switch networks in your wallet and refresh.
          </p>
        )}
      </div>
    </AppLayout>
  );
}

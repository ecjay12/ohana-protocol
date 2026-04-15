import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Routes, Route, Link, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useInjectedWallet } from "./hooks/useInjectedWallet";
import { useHandshake, CATEGORIES, type VouchData } from "./hooks/useHandshake";
import { useSessionSidebarProfile } from "./hooks/useSessionSidebarProfile";
import { useProfileVouches } from "./hooks/useProfileVouches";
import { countVouchesWithStatus } from "./lib/vouchStatusCounts";
import { VOUCH_FEE_DISPLAY } from "./config/contracts";
import { getHiddenVouchesFromUP, addHiddenVoucherToUP, removeHiddenVoucherFromUP } from "./lib/upHiddenVouches";
import { getHiddenVouchers } from "./lib/hiddenVouchersStorage";
import { hasERC8004Support } from "./lib/erc8004";
import { submitVouchAsFeedback } from "./lib/syncHandshakeToERC8004";
import { AppLayout } from "./layout/AppLayout";
import { HeroSection } from "./components/HeroSection";
import { AgentDashboardCard } from "./components/AgentDashboardCard";
import { VouchCard } from "./components/VouchCard";
import { PendingVouchesCard } from "./components/PendingVouchesCard";
import { HistoryCard, type HistoryVouch } from "./components/HistoryCard";
import { AcceptedVouchesCard } from "./components/AcceptedVouchesCard";
import { GlowButton } from "./components/GlowButton";
import { VouchRedirect } from "./components/VouchRedirect";
import { useActivityToast } from "./contexts/ActivityToastContext";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const IntegratePage = lazy(() => import("./pages/IntegratePage").then((m) => ({ default: m.IntegratePage })));
const BadgePage = lazy(() => import("./pages/BadgePage").then((m) => ({ default: m.BadgePage })));
const EmbedPage = lazy(() => import("./pages/EmbedPage").then((m) => ({ default: m.EmbedPage })));
const MiniappPage = lazy(() => import("./pages/MiniappPage").then((m) => ({ default: m.MiniappPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })));
const VouchGraphPage = lazy(() => import("./pages/VouchGraphPage").then((m) => ({ default: m.VouchGraphPage })));
const UpIdentityPage = lazy(() => import("./pages/UpIdentityPage").then((m) => ({ default: m.UpIdentityPage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const HelpPage = lazy(() => import("./pages/HelpPage").then((m) => ({ default: m.HelpPage })));

function RouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-theme-text-muted">
      Loading…
    </div>
  );
}

function App() {
  const {
    accounts,
    chainId,
    isConnected,
    error,
    hasInjected,
    availableWallets,
    connect,
    connectWith,
    disconnect,
    switchChain,
    chains,
    provider,
  } = useInjectedWallet();

  const account = accounts[0] ?? "";
  const chainName = chains[chainId as keyof typeof chains]?.name ?? `Chain ${chainId}`;
  const shortAddr = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "";

  const {
    error: handshakeError,
    txPending,
    fee,
    isSupported,
    vouch,
    acceptVouch,
    denyVouch,
    hideVouch,
    unhideVouch,
    removeVouch,
    getVouch,
    getVouchersFor,
    getTargetsVouchedBy,
    getIncomingPending,
    getIncomingPendingForTarget,
    getUPForEOA,
    STATUS_LABELS,
  } = useHandshake(provider, chainId, account);

  // Sidebar / hero: show linked UP when signed in with EOA; LUKSO LSP when UP is used off-LUKSO
  const sidebarSession = useSessionSidebarProfile(
    provider,
    chainId,
    account || null,
    getUPForEOA
  );
  const userProfileData = sidebarSession.headerProfileData;
  const userProfileLoading = sidebarSession.headerLoading;
  /** UP on the wallet’s current chain only — used for LSP2 / UP-only flows */
  const userIsUP = sidebarSession.signerIsUPOnWalletChain;

  /** Same identity + aggregation as profile page — totals include all Handshake networks for UPs / linked EOAs. */
  const dashboardVouchIdentity = useMemo(() => {
    const raw = (sidebarSession.headerAddress ?? account ?? "").trim();
    return raw || null;
  }, [sidebarSession.headerAddress, account]);

  const dashboardAggregateAsUP = useMemo(
    () => Boolean(sidebarSession.headerIsUP || sidebarSession.signingIsUP),
    [sidebarSession.headerIsUP, sidebarSession.signingIsUP]
  );

  const dashboardVouches = useProfileVouches(
    dashboardVouchIdentity,
    chainId,
    Boolean(dashboardVouchIdentity && dashboardAggregateAsUP)
  );

  const profilePathAddress = (sidebarSession.headerAddress ?? account).trim() || undefined;

  const dashboardAggregateLoading = Boolean(
    dashboardVouchIdentity && dashboardAggregateAsUP && dashboardVouches.loading
  );

  const [incoming, setIncoming] = useState<{ voucher: string; category: number }[]>([]);
  const [pendingTargetAddress, setPendingTargetAddress] = useState<string | null>(null);
  const [vouchersForMe, setVouchersForMe] = useState<string[]>([]);
  const [targetsVouchedBy, setTargetsVouchedBy] = useState<string[]>([]);
  const [vouchStatuses, setVouchStatuses] = useState<Record<string, VouchData>>({});
  const [vouchesGivenStatuses, setVouchesGivenStatuses] = useState<Record<string, VouchData>>({});
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingGiven, setLoadingGiven] = useState(false);
  const loading = loadingPending || loadingGiven;

  const [refreshKey, setRefreshKey] = useState(0);
  const [hiddenVouchers, setHiddenVouchers] = useState<Set<string>>(new Set());
  const [hiddenVouchersLSP2, setHiddenVouchersLSP2] = useState<Set<string>>(new Set());
  const [pendingBannerDismissed, setPendingBannerDismissed] = useState(false);

  const heroVouchesReceived = useMemo(() => {
    if (!isConnected || !dashboardVouchIdentity) return 0;
    if (dashboardAggregateLoading) return vouchersForMe.length;
    if (!dashboardAggregateAsUP && dashboardVouches.loading) return vouchersForMe.length;
    return dashboardVouches.vouchersForTarget.length;
  }, [
    isConnected,
    dashboardVouchIdentity,
    dashboardAggregateLoading,
    dashboardAggregateAsUP,
    dashboardVouches.loading,
    vouchersForMe.length,
    dashboardVouches.vouchersForTarget.length,
  ]);

  const heroVouchesGiven = useMemo(() => {
    if (!isConnected || !dashboardVouchIdentity) return 0;
    if (dashboardAggregateLoading) return targetsVouchedBy.length;
    if (!dashboardAggregateAsUP && dashboardVouches.loading) return targetsVouchedBy.length;
    return dashboardVouches.targetsVouchedBy.length;
  }, [
    isConnected,
    dashboardVouchIdentity,
    dashboardAggregateLoading,
    dashboardAggregateAsUP,
    dashboardVouches.loading,
    targetsVouchedBy.length,
    dashboardVouches.targetsVouchedBy.length,
  ]);

  const crossNetworkHistorySummary = useMemo(() => {
    if (!isConnected || !dashboardVouchIdentity || !dashboardAggregateAsUP || dashboardVouches.loading) {
      return undefined;
    }
    const { vouchersForTarget, targetsVouchedBy: aggTargets, vouchStatuses, givenVouchStatuses } =
      dashboardVouches;
    return {
      totalGiven: aggTargets.length,
      totalReceived: vouchersForTarget.length,
      givenAccepted: countVouchesWithStatus(aggTargets, givenVouchStatuses, [2]),
      receivedAccepted: countVouchesWithStatus(vouchersForTarget, vouchStatuses, [2]),
      receivedPending: countVouchesWithStatus(vouchersForTarget, vouchStatuses, [1]),
    };
  }, [
    isConnected,
    dashboardVouchIdentity,
    dashboardAggregateAsUP,
    dashboardVouches.loading,
    dashboardVouches.vouchersForTarget,
    dashboardVouches.targetsVouchedBy,
    dashboardVouches.vouchStatuses,
    dashboardVouches.givenVouchStatuses,
  ]);

  const [searchParams] = useSearchParams();
  const { showToast } = useActivityToast();
  const pendingToastShownRef = useRef(false);
  const welcomeToastShownRef = useRef(false);
  const prevAcceptedCountRef = useRef<number | null>(null);
  const vouchAddressFromUrl = searchParams.get("vouchAddress") ?? "";
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const providerRef = useRef(provider);
  providerRef.current = provider;

  // Engagement: show popup when pending vouches load (once per session)
  useEffect(() => {
    if (!account || loading || incoming.length === 0 || pendingToastShownRef.current) return;
    pendingToastShownRef.current = true;
    showToast(
      `You have ${incoming.length} pending vouch${incoming.length !== 1 ? "es" : ""} to review.`,
      {
        type: "engagement",
        duration: 7000,
        action: {
          label: "Review now →",
          onClick: () => {
            const el = document.querySelector('[data-pending-vouches]');
            el?.scrollIntoView({ behavior: "smooth" });
          },
        },
      }
    );
  }, [account, loading, incoming.length, showToast]);

  // Reset toast flags when user disconnects
  useEffect(() => {
    if (!account) {
      pendingToastShownRef.current = false;
      welcomeToastShownRef.current = false;
    }
  }, [account]);

  // Engagement: welcome toast when connected with no pending (once per session)
  useEffect(() => {
    if (!account || !isSupported || loading || welcomeToastShownRef.current) return;
    if (incoming.length > 0) return; // Don't show welcome if they have pending
    welcomeToastShownRef.current = true;
    showToast("Welcome! Vouch for others or get vouched to grow your public reputation.", {
      type: "engagement",
      duration: 6000,
    });
  }, [account, isSupported, loading, incoming.length, showToast]);

  // Engagement: first vouch received milestone
  useEffect(() => {
    if (!account || loading) return;
    const count = heroVouchesReceived;
    const prev = prevAcceptedCountRef.current;
    prevAcceptedCountRef.current = count;
    if (prev !== null && count > prev && prev === 0 && count === 1) {
      showToast("You've received your first vouch! 🎉", { type: "engagement", duration: 5000 });
    }
  }, [account, loading, heroVouchesReceived, showToast]);

  // Load LSP2 hidden vouches from UP (ref: avoid re-running on new BrowserProvider identity)
  useEffect(() => {
    const p = providerRef.current;
    if (!p || !account || !userIsUP) {
      setHiddenVouchersLSP2(new Set());
      return;
    }
    let cancelled = false;
    getHiddenVouchesFromUP(p, account)
      .then((list: string[]) => {
        if (!cancelled) {
          setHiddenVouchersLSP2(new Set(list.map((a: string) => a.toLowerCase())));
        }
      })
      .catch(() => {
        if (!cancelled) setHiddenVouchersLSP2(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, account, userIsUP, refreshKey]);

  // Load localStorage hidden vouches (legacy, will be replaced by on-chain + LSP2)
  useEffect(() => {
    if (!account) {
      setHiddenVouchers(new Set());
      return;
    }
    setHiddenVouchers(getHiddenVouchers(chainId, account));
  }, [chainId, account]);

  useEffect(() => {
    if (!isSupported || !account) {
      setIncoming([]);
      setPendingTargetAddress(null);
      setVouchersForMe([]);
      setLoadingPending(false);
      return;
    }
    let cancelled = false;
    setLoadingPending(true);
    (async () => {
      const incPromise = getIncomingPending();
      const listPromise = getVouchersFor(account);
      const linkedUPPromise = getUPForEOA(account);
      const [incResult, listResult, linkedUP] = await Promise.all([
        incPromise,
        listPromise,
        linkedUPPromise,
      ]);
      let pendingForUp: { voucher: string; category: number }[] = [];
      if (linkedUP) {
        try {
          pendingForUp = await getIncomingPendingForTarget(linkedUP);
        } catch {}
      }
      const inc = Array.isArray(incResult) ? incResult : [];
      const list = Array.isArray(listResult) ? listResult : [];
      if (cancelled) return;
      const mergedIncoming = inc.length > 0 ? inc : pendingForUp;
      setIncoming(mergedIncoming);
      setPendingTargetAddress(inc.length > 0 ? null : (pendingForUp.length > 0 && linkedUP ? linkedUP : null));
      setVouchersForMe(list);
    })()
      .catch(() => {
        if (!cancelled) {
          setIncoming([]);
          setPendingTargetAddress(null);
          setVouchersForMe([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSupported, account, chainId, refreshKey]);

  // Fetch vouches given (targets user vouched for)
  useEffect(() => {
    if (!isSupported || !account) {
      setTargetsVouchedBy([]);
      setVouchesGivenStatuses({});
      setLoadingGiven(false);
      return;
    }
    let cancelled = false;
    setLoadingGiven(true);
    getTargetsVouchedBy(account)
      .then((targets) => {
        if (!cancelled) {
          const list = Array.isArray(targets) ? targets : [];
          setTargetsVouchedBy(list);
          if (list.length === 0) {
            setVouchesGivenStatuses({});
            return;
          }
          const map: Record<string, VouchData> = {};
          Promise.all(
            list.map(async (target) => {
              try {
                const v = await getVouch(target, account);
                if (v && !cancelled) map[target] = v;
              } catch {
                // ignore per-target failures
              }
            })
          ).then(() => {
            if (!cancelled) setVouchesGivenStatuses(map);
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTargetsVouchedBy([]);
          setVouchesGivenStatuses({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGiven(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSupported, account, chainId, refreshKey]);

  // Fetch vouch statuses for received vouches
  useEffect(() => {
    if (!isSupported || !account || vouchersForMe.length === 0) {
      setVouchStatuses({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const map: Record<string, VouchData> = {};
      for (const voucher of vouchersForMe) {
        try {
          const v = await getVouch(account, voucher);
          if (v && !cancelled) map[voucher] = v;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setVouchStatuses(map);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isSupported, account, chainId, vouchersForMe, refreshKey]);

  // Build history vouches (given + received)
  const historyVouchesGiven: HistoryVouch[] = useMemo(() => {
    return targetsVouchedBy.map((target) => {
      const v = vouchesGivenStatuses[target];
      return {
        type: "given" as const,
        address: target,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
        updatedAt: v?.updatedAt ?? 0n,
        hidden: v?.hidden ?? false,
      };
    });
  }, [targetsVouchedBy, vouchesGivenStatuses]);

  const historyVouchesReceived: HistoryVouch[] = useMemo(() => {
    return vouchersForMe.map((voucher) => {
      const v = vouchStatuses[voucher];
      return {
        type: "received" as const,
        address: voucher,
        category: v?.category ?? 0,
        status: v?.status ?? 0,
        timestamp: v?.timestamp ?? 0n,
        updatedAt: v?.updatedAt ?? 0n,
        hidden: v?.hidden ?? false,
      };
    });
  }, [vouchersForMe, vouchStatuses]);

  const handleVouch = async (address: string, category: number) => {
    const ok = await vouch(address, category);
    if (!ok) return;
    refresh();
    showToast("Vouch sent! They'll see it in their pending list.", { type: "success" });
  };

  const handleAccept = async (voucher: string) => {
    await acceptVouch(voucher);
    refresh();
    showToast("Vouch accepted!", { type: "success" });
  };

  const handleDeny = async (voucher: string) => {
    await denyVouch(voucher);
    refresh();
    showToast("Vouch denied.", { type: "info" });
  };

  const handleHideAcceptedVouch = useCallback(
    async (voucherAddress: string) => {
      if (!account || !provider) return;
      try {
        // Hide on-chain
        await hideVouch(voucherAddress);
        // Also add to LSP2 if user is UP
        if (userIsUP) {
          try {
            const signer = await provider.getSigner();
            await addHiddenVoucherToUP(signer, account, voucherAddress);
          } catch {
            // LSP2 update failed, but on-chain hide succeeded
          }
        }
        refresh();
      } catch (e) {
        console.error("Failed to hide vouch:", e);
      }
    },
    [account, provider, hideVouch, userIsUP, refresh]
  );

  const handleUnhideAcceptedVouch = useCallback(
    async (voucherAddress: string) => {
      if (!account || !provider) return;
      try {
        // Unhide on-chain
        await unhideVouch(voucherAddress);
        // Remove from LSP2 if user is UP
        if (userIsUP) {
          try {
            const signer = await provider.getSigner();
            await removeHiddenVoucherFromUP(signer, account, voucherAddress);
          } catch {
            // LSP2 update failed, but on-chain unhide succeeded
          }
        }
        refresh();
      } catch (e) {
        console.error("Failed to unhide vouch:", e);
      }
    },
    [account, provider, unhideVouch, userIsUP, refresh]
  );

  const handleRemoveVouch = useCallback(
    async (target: string) => {
      try {
        await removeVouch(target);
        refresh();
      } catch (e) {
        console.error("Failed to remove vouch:", e);
      }
    },
    [removeVouch, refresh]
  );

  const handlePublishToERC8004 = useCallback(
    async (_targetAddress: string, category: number, targetAgentId: number) => {
      if (!provider || !account) return;
      const signer = await provider.getSigner();
      await submitVouchAsFeedback({
        signer,
        chainId,
        targetAgentId,
        category,
      });
      refresh();
      showToast("Published to ERC-8004!", { type: "success" });
    },
    [provider, account, chainId, refresh, showToast]
  );

  const feeDisplay = VOUCH_FEE_DISPLAY[chainId];
  const feeLabel = feeDisplay
    ? `${feeDisplay.amount} ${feeDisplay.symbol}`
    : fee
      ? `${(Number(fee) / 1e18).toFixed(4)} ETH`
      : "—";

  const dashboardContent = (
    <AppLayout
      chainId={chainId}
      chains={chains as Record<number, { name: string; rpc: string }>}
      shortAddress={shortAddr}
      account={account}
      isConnected={isConnected}
      hasInjected={hasInjected}
      availableWallets={availableWallets}
      walletError={error}
      userProfileData={userProfileData}
      userProfileLoading={userProfileLoading}
      profileHeaderAddress={sidebarSession.headerAddress ?? undefined}
      userIsUP={userIsUP}
      onConnect={connect}
      onConnectWith={connectWith}
      onSwitchChain={switchChain}
      onDisconnect={disconnect}
    >
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-5 sm:py-10 md:px-8 md:py-12">
        <HeroSection
          isConnected={isConnected}
          account={account}
          profilePathAddress={profilePathAddress}
          vouchesReceived={heroVouchesReceived}
          vouchesGiven={heroVouchesGiven}
          onConnect={connect}
          onConnectWith={connectWith}
          availableWallets={availableWallets}
          hasInjected={hasInjected}
        />
        {handshakeError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {handshakeError}
          </motion.div>
        )}
        {!isSupported ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6"
          >
            <p className="text-amber-200">
              Handshake isn&apos;t available on this network. Switch to LUKSO, Base, LUKSO Testnet, or Base Sepolia.
            </p>
          </motion.div>
        ) : (
          <>
            {incoming.length > 0 && !pendingBannerDismissed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-xl border border-theme-accent bg-theme-accent-soft px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
              >
                <p className="text-sm text-theme-text">
                  You have {incoming.length} pending vouch{incoming.length !== 1 ? "es" : ""}. Accept or deny in Pending vouches below.
                </p>
                <button
                  type="button"
                  onClick={() => setPendingBannerDismissed(true)}
                  className="shrink-0 self-start rounded-lg px-2 py-1 text-xs text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text sm:self-auto"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
            <AgentDashboardCard isSupported={isSupported} chainName={chainName} />
            {isConnected && account && isSupported && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-5"
              >
                <h3 className="text-sm font-semibold text-theme-text">Universal Profile &amp; wallets</h3>
                <p className="mt-1 text-sm text-theme-text-muted">
                  Link your other wallets to your Universal Profile on LUKSO so endorsements from every address show
                  on one profile.
                </p>
                <Link
                  to={`/profile/${profilePathAddress ?? account}#link-wallets`}
                  className="mt-3 inline-flex text-sm font-medium text-theme-accent hover:underline"
                >
                  Open Link wallets on your profile →
                </Link>
              </motion.div>
            )}
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl border border-theme-accent bg-theme-accent-soft p-6"
              >
                <p className="mb-4 text-base leading-relaxed text-theme-text">
                  Connect your wallet to vouch for others, accept or deny vouches, and manage your Handshake profile.
                </p>
                <p className="mb-4 text-xs text-theme-text-dim">
                  By connecting your wallet, you agree to our{" "}
                  <Link to="/terms" className="text-theme-accent hover:underline">
                    Terms of Service
                  </Link>
                  .
                </p>
                {availableWallets.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableWallets.map((wallet) => (
                      <GlowButton key={wallet.label} onClick={() => connectWith(wallet)}>
                        Connect with {wallet.label}
                      </GlowButton>
                    ))}
                  </div>
                ) : (
                  <>
                    <GlowButton onClick={connect} disabled={!hasInjected}>
                      {hasInjected ? "Connect wallet" : "No wallet found"}
                    </GlowButton>
                    {!hasInjected && (
                      <p className="mt-3 text-sm text-theme-dim">Install MetaMask or the Universal Profile extension.</p>
                    )}
                  </>
                )}
              </motion.div>
            )}
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
              <VouchCard
                feeLabel={feeLabel}
                categories={CATEGORIES}
                txPending={txPending}
                onVouch={handleVouch}
                disabled={!isConnected}
                initialAddress={vouchAddressFromUrl}
              />
              <div data-pending-vouches>
                <PendingVouchesCard
                  incoming={incoming}
                  loading={loading}
                  txPending={txPending}
                  categories={CATEGORIES}
                  onAccept={handleAccept}
                  onDeny={handleDeny}
                  onRefresh={refresh}
                  pendingTargetAddress={pendingTargetAddress}
                  disabled={!isConnected}
                />
              </div>
              <HistoryCard
                chainId={chainId}
                account={account}
                provider={provider}
                vouchesGiven={historyVouchesGiven}
                vouchesReceived={historyVouchesReceived}
                loading={loading}
                txPending={txPending}
                statusLabels={STATUS_LABELS as Record<number, string>}
                categories={CATEGORIES}
                hiddenVouchers={new Set([...hiddenVouchers, ...hiddenVouchersLSP2])}
                onHideVouch={handleHideAcceptedVouch}
                onUnhideVouch={handleUnhideAcceptedVouch}
                onRemoveVouch={handleRemoveVouch}
                onRefresh={refresh}
                disabled={!isConnected}
                hasERC8004Support={hasERC8004Support(chainId)}
                onPublishToERC8004={handlePublishToERC8004}
                crossNetworkSummary={crossNetworkHistorySummary}
                viewProfileAddress={profilePathAddress}
              />
              <AcceptedVouchesCard
                vouchersForMe={vouchersForMe}
                vouchStatuses={vouchStatuses}
                loading={loading}
                categories={CATEGORIES}
                hiddenVouchers={new Set([...hiddenVouchers, ...hiddenVouchersLSP2])}
                onHideVouch={handleHideAcceptedVouch}
                onUnhideVouch={handleUnhideAcceptedVouch}
                onRemoveVouch={handleRemoveVouch}
                provider={provider}
                account={account}
                onRefresh={refresh}
                disabled={!isConnected}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );

  const location = useLocation();

  const pageTransition = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.25 },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition} className="min-h-full">
        <Suspense fallback={<RouteLoading />}>
          <Routes location={location}>
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/vouch-graph" element={<VouchGraphPage />} />
            <Route path="/up-identity" element={<UpIdentityPage />} />
            <Route path="/profile/:address" element={<ProfilePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/vouch" element={<VouchRedirect />} />
            <Route path="/integrate" element={<IntegratePage />} />
            <Route path="/badge" element={<BadgePage />} />
            <Route path="/embed" element={<EmbedPage />} />
            <Route path="/miniapp" element={<MiniappPage />} />
            <Route path="/app" element={dashboardContent} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default App;

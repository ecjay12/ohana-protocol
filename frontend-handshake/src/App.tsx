import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Routes, Route, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useInjectedWallet } from "./hooks/useInjectedWallet";
import { useHandshake, CATEGORIES, type VouchData } from "./hooks/useHandshake";
import { useProfileData } from "./hooks/useProfileData";
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
import { ProfilePage } from "./pages/ProfilePage";
import { IntegratePage } from "./pages/IntegratePage";
import { BadgePage } from "./pages/BadgePage";
import { EmbedPage } from "./pages/EmbedPage";
import { MiniappPage } from "./pages/MiniappPage";
import { AboutPage } from "./pages/AboutPage";
import { TermsPage } from "./pages/TermsPage";
import { VouchRedirect } from "./components/VouchRedirect";
import { useActivityToast } from "./contexts/ActivityToastContext";

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

  // Profile data for logged-in user
  const { profileData: userProfileData, isUP: userIsUP } = useProfileData(
    provider,
    account,
    chainId
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
  const [searchParams] = useSearchParams();
  const { showToast } = useActivityToast();
  const pendingToastShownRef = useRef(false);
  const welcomeToastShownRef = useRef(false);
  const prevAcceptedCountRef = useRef<number | null>(null);
  const vouchAddressFromUrl = searchParams.get("vouchAddress") ?? "";
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
    showToast("Welcome! Vouch for others or get vouched to build your on-chain reputation.", {
      type: "engagement",
      duration: 6000,
    });
  }, [account, isSupported, loading, incoming.length, showToast]);

  // Engagement: first vouch received milestone
  useEffect(() => {
    if (!account || loading) return;
    const count = vouchersForMe.length;
    const prev = prevAcceptedCountRef.current;
    prevAcceptedCountRef.current = count;
    if (prev !== null && count > prev && prev === 0 && count === 1) {
      showToast("You've received your first vouch! 🎉", { type: "engagement", duration: 5000 });
    }
  }, [account, loading, vouchersForMe.length, showToast]);

  // Load LSP2 hidden vouches from UP
  useEffect(() => {
    if (!provider || !account || !userIsUP) {
      setHiddenVouchersLSP2(new Set());
      return;
    }
    let cancelled = false;
    getHiddenVouchesFromUP(provider, account)
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
  }, [provider, account, userIsUP, refreshKey]);

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
  }, [isSupported, account, getIncomingPending, getIncomingPendingForTarget, getVouchersFor, getUPForEOA, refreshKey]);

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
  }, [isSupported, account, getTargetsVouchedBy, getVouch, refreshKey]);

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
  }, [isSupported, account, getVouch, vouchersForMe, refreshKey]);

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

  const handleVouch = async (address: string, category: number, _message?: string) => {
    await vouch(address, category);
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

  return (
    <Routes>
      <Route path="/profile/:address" element={<ProfilePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/vouch" element={<VouchRedirect />} />
      <Route path="/integrate" element={<IntegratePage />} />
      <Route path="/badge" element={<BadgePage />} />
      <Route path="/embed" element={<EmbedPage />} />
      <Route path="/miniapp" element={<MiniappPage />} />
      <Route
        path="/"
        element={
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
            userIsUP={userIsUP}
            onConnect={connect}
            onConnectWith={connectWith}
            onSwitchChain={switchChain}
            onDisconnect={disconnect}
          >
            <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <HeroSection
          isConnected={isConnected}
          account={account}
          vouchesReceived={vouchersForMe.length}
          vouchesGiven={targetsVouchedBy.length}
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
                className="flex items-center justify-between gap-4 rounded-xl border border-theme-accent bg-theme-accent-soft px-4 py-3"
              >
                <p className="text-sm text-theme-text">
                  You have {incoming.length} pending vouch{incoming.length !== 1 ? "es" : ""}. Accept or deny in Pending vouches below.
                </p>
                <button
                  type="button"
                  onClick={() => setPendingBannerDismissed(true)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
            <AgentDashboardCard isSupported={isSupported} chainName={chainName} />
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl border border-theme-accent bg-theme-accent-soft p-6"
              >
                <p className="mb-4 text-sm text-theme-text">
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
            <div className="grid gap-6 lg:grid-cols-2">
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
        }
      />
    </Routes>
  );
}

export default App;

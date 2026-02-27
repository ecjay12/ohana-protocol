/**
 * Minidapp layout for UPs / smart wallets (iframe-friendly).
 * Optional ?address=0x... or postMessage { type: 'ohana-handshake-address', address } from host.
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshake, CATEGORIES } from "@/hooks/useHandshake";
import { useHandshakeReadOnly } from "@/hooks/useHandshakeReadOnly";
import { useHostAddress } from "@/hooks/useHostAddress";
import { VOUCH_FEE_DISPLAY } from "@/config/contracts";
import { MiniappLayout } from "@/layout/MiniappLayout";
import { AgentDashboardCard } from "@/components/AgentDashboardCard";
import { VouchCard } from "@/components/VouchCard";
import { PendingVouchesCard } from "@/components/PendingVouchesCard";
import { GlowButton } from "@/components/GlowButton";

export function MiniappPage() {
  const [searchParams] = useSearchParams();
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 4201;
  const hostAddress = useHostAddress();

  const {
    accounts,
    chainId: walletChainId,
    isConnected,
    hasInjected,
    availableWallets,
    connect,
    connectWith,
    provider,
    chains,
  } = useInjectedWallet();

  const account = accounts[0] ?? "";
  const effectiveChainId = isConnected ? walletChainId : chainId;
  const chainName = chains[effectiveChainId as keyof typeof chains]?.name ?? `Chain ${effectiveChainId}`;

  const {
    txPending,
    fee,
    isSupported,
    vouch,
    acceptVouch,
    denyVouch,
    getIncomingPending,
    getAcceptedCount,
  } = useHandshake(provider, effectiveChainId, isConnected ? account : null);

  const { acceptedCount: readOnlyCount, incomingPending: readOnlyPending, loading: readOnlyLoading } = useHandshakeReadOnly(
    effectiveChainId,
    !isConnected && hostAddress ? hostAddress : null
  );

  const [incoming, setIncoming] = useState<{ voucher: string; category: number }[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!isConnected || !isSupported || !account) {
      setIncoming([]);
      setAcceptedCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getIncomingPending(), getAcceptedCount(account)])
      .then(([inc, count]) => {
        if (!cancelled) {
          setIncoming(inc);
          setAcceptedCount(count);
        }
      })
      .catch(() => {
        if (!cancelled) setIncoming([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, isSupported, account, getIncomingPending, getAcceptedCount, refreshKey]);

  const handleVouch = async (address: string, category: number) => {
    await vouch(address, category);
    refresh();
  };

  const handleAccept = async (voucher: string) => {
    await acceptVouch(voucher);
    refresh();
  };

  const handleDeny = async (voucher: string) => {
    await denyVouch(voucher);
    refresh();
  };

  const feeDisplay = VOUCH_FEE_DISPLAY[effectiveChainId];
  const feeLabel = feeDisplay
    ? `${feeDisplay.amount} ${feeDisplay.symbol}`
    : fee
      ? `${(Number(fee) / 1e18).toFixed(4)} ETH`
      : "—";

  const displayCount = isConnected ? acceptedCount : readOnlyCount;
  const displayPending = isConnected ? incoming : readOnlyPending;

  return (
    <MiniappLayout chainName={chainName}>
      <div className="mx-auto max-w-xl space-y-6">
        <AgentDashboardCard isSupported={isSupported} chainName={chainName} />

        {/* Read-only stats when host provides address and not connected */}
        {hostAddress && !isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-theme-border bg-theme-surface p-4"
          >
            {readOnlyLoading ? (
              <p className="text-sm text-theme-text-muted">Loading…</p>
            ) : (
              <>
                <p className="text-sm text-theme-text">
                  Your vouch count: <strong>{displayCount}</strong>
                </p>
                <p className="mt-1 text-sm text-theme-text-muted">
                  Pending: {displayPending.length}
                </p>
                <p className="mt-3 text-xs text-theme-text-dim">
                  Connect your wallet below to vouch or accept/deny.
                </p>
              </>
            )}
          </motion.div>
        )}

        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-theme-accent bg-theme-accent-soft p-4"
          >
            <p className="mb-3 text-sm text-theme-text">
              Connect your wallet to vouch for others and manage pending vouches.
            </p>
            {availableWallets.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {availableWallets.map((w) => (
                  <GlowButton key={w.label} onClick={() => connectWith(w)}>
                    Connect with {w.label}
                  </GlowButton>
                ))}
              </div>
            ) : (
              <GlowButton onClick={connect} disabled={!hasInjected}>
                {hasInjected ? "Connect wallet" : "No wallet found"}
              </GlowButton>
            )}
            <p className="mt-3 text-xs text-theme-text-dim">
              By connecting, you agree to our{" "}
              <Link to="/terms" className="text-theme-accent hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </motion.div>
        )}

        {isConnected && (
          <>
            <div className="rounded-xl border border-theme-border bg-theme-surface p-3 text-sm text-theme-text">
              Your vouch count: <strong>{displayCount}</strong>
              {displayPending.length > 0 && (
                <> · Pending: <strong>{displayPending.length}</strong></>
              )}
            </div>
            <div className="space-y-4">
              <VouchCard
                feeLabel={feeLabel}
                categories={CATEGORIES}
                txPending={txPending}
                onVouch={handleVouch}
                disabled={false}
              />
              <PendingVouchesCard
                incoming={incoming}
                loading={loading}
                txPending={txPending}
                categories={CATEGORIES}
                onAccept={handleAccept}
                onDeny={handleDeny}
                onRefresh={refresh}
                disabled={false}
              />
            </div>
          </>
        )}

        <p className="text-center text-sm text-theme-text-muted">
          <Link to={account ? `/profile/${account}` : "/"} className="text-theme-accent hover:underline">
            {account ? "View profile" : "Open full app"}
          </Link>
        </p>
      </div>
    </MiniappLayout>
  );
}

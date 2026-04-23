/**
 * Protocol admin dashboard — owner-gated.
 * Shows contract state, fee balances, withdraw controls, and scannable
 * protocol-wide metrics for the currently selected chain.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Coins,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useHandshakeAdmin } from "@/hooks/useHandshakeAdmin";
import { useProtocolMetrics } from "@/hooks/useProtocolMetrics";
import { useSessionSidebarProfile } from "@/hooks/useSessionSidebarProfile";
import { useHandshake } from "@/hooks/useHandshake";
import { HANDSHAKE_CHAIN_IDS } from "@/config/contracts";
import { AppLayout } from "@/layout/AppLayout";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";

const NATIVE_SYMBOLS: Record<number, string> = {
  1: "ETH",
  42: "LYX",
  4201: "LYXt",
  8453: "ETH",
  84532: "ETH",
};

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
      <div className="flex items-center gap-2 text-theme-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-theme-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-theme-text-dim">{hint}</p>}
    </div>
  );
}

export function AdminPage() {
  const {
    accounts,
    chainId,
    chains,
    isConnected,
    hasInjected,
    availableWallets,
    error: walletError,
    provider,
    connect,
    connectWith,
    disconnect,
    switchChain,
  } = useInjectedWallet();
  const account = accounts[0] ?? null;
  const chainName = chains[chainId as keyof typeof chains]?.name ?? `Chain ${chainId}`;
  const shortAddrWallet = account ? shortAddr(account) : "";
  const nativeSymbol = NATIVE_SYMBOLS[chainId] ?? "ETH";

  const { getUPForEOA } = useHandshake(provider, chainId, account);
  const sidebarSession = useSessionSidebarProfile(provider, chainId, account, getUPForEOA);

  const admin = useHandshakeAdmin(provider, chainId, account, {
    signerIsUniversalProfileOnChain:
      sidebarSession.signerIsUPOnWalletChain && (chainId === 42 || chainId === 4201),
  });
  const metricsHook = useProtocolMetrics(chainId);

  const [feeInput, setFeeInput] = useState("");
  const [collectorInput, setCollectorInput] = useState("");
  const [transferOwnerInput, setTransferOwnerInput] = useState("");
  const transferOwnerPrefilled = useRef(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isAdminChain = HANDSHAKE_CHAIN_IDS.includes(chainId);

  useEffect(() => {
    if (transferOwnerPrefilled.current || !admin.state.feeCollector) return;
    setTransferOwnerInput(admin.state.feeCollector);
    transferOwnerPrefilled.current = true;
  }, [admin.state.feeCollector]);

  /** LUKSO: owner is controller EOA, fee collector is often the UP — connected UP can withdraw but not onlyOwner. */
  const luksoUpSignerMismatch = useMemo(() => {
    if (chainId !== 42 && chainId !== 4201) return false;
    if (!account || !admin.state.owner || !admin.state.feeCollector) return false;
    const owner = admin.state.owner.toLowerCase();
    const collector = admin.state.feeCollector.toLowerCase();
    const acct = account.toLowerCase();
    if (owner === collector) return false;
    return acct === collector && acct !== owner && admin.canWithdraw;
  }, [chainId, account, admin.state.owner, admin.state.feeCollector, admin.canWithdraw]);

  const feeDisplay = useMemo(() => {
    if (!admin.state.fee) return `0 ${nativeSymbol}`;
    return `${admin.feeFormatted} ${nativeSymbol}`;
  }, [admin.feeFormatted, admin.state.fee, nativeSymbol]);

  const withdrawable = admin.state.accumulatedFees > 0n;

  const handleWithdraw = async () => {
    setActionNotice(null);
    const ok = await admin.withdrawFees();
    setActionNotice(ok ? "Fees withdrawn to fee collector." : "Withdraw failed.");
  };

  const handleSetFee = async () => {
    setActionNotice(null);
    if (!feeInput.trim()) {
      setActionNotice("Enter a fee amount first.");
      return;
    }
    const ok = await admin.setFee(feeInput);
    setActionNotice(ok ? `Fee updated to ${feeInput} ${nativeSymbol}.` : "Set fee failed.");
    if (ok) setFeeInput("");
  };

  const handleSetCollector = async () => {
    setActionNotice(null);
    if (!collectorInput.trim()) {
      setActionNotice("Enter an address first.");
      return;
    }
    const ok = await admin.setFeeCollector(collectorInput);
    setActionNotice(ok ? "Fee collector updated." : "Set fee collector failed.");
    if (ok) setCollectorInput("");
  };

  const handleTransferOwnership = async () => {
    setActionNotice(null);
    if (!transferOwnerInput.trim()) {
      setActionNotice("Enter the new owner address (e.g. your Universal Profile).");
      return;
    }
    const ok = await admin.transferOwnership(transferOwnerInput);
    setActionNotice(
      ok
        ? "Ownership transferred. If you use the UP extension, reconnect — admin should match your profile address now."
        : "Transfer ownership failed."
    );
  };

  return (
    <AppLayout
      chainId={chainId}
      chains={chains as Record<number, { name: string; rpc: string }>}
      shortAddress={shortAddrWallet}
      account={account ?? undefined}
      isConnected={isConnected}
      hasInjected={hasInjected}
      availableWallets={availableWallets}
      walletError={walletError}
      userProfileData={sidebarSession.headerProfileData}
      userProfileLoading={sidebarSession.headerLoading}
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

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface-strong px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-theme-text-muted">
            <KeyRound className="h-3.5 w-3.5" />
            Protocol Admin
          </div>
          <h1 className="text-3xl font-bold text-theme-text sm:text-4xl">Handshake Admin</h1>
          <p className="max-w-2xl text-sm text-theme-text-muted">
            Manage fees, withdraw collected balance, and inspect protocol usage for{" "}
            <span className="font-semibold text-theme-text">{chainName}</span>.
          </p>
        </motion.header>

        {!isAdminChain && (
          <GlassCard>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-theme-text">
                  Handshake is not deployed on {chainName}.
                </p>
                <p className="mt-1 text-sm text-theme-text-muted">
                  Switch your wallet to a supported network to administer the contract.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {isAdminChain && !isConnected && (
          <GlassCard>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 text-theme-accent" />
              <div>
                <p className="text-sm font-semibold text-theme-text">Connect your wallet</p>
                <p className="mt-1 text-sm text-theme-text-muted">
                  Connect the wallet that owns the Handshake contract on {chainName} to see admin
                  controls.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {isAdminChain &&
          isConnected &&
          !admin.isOwner &&
          !admin.canWithdraw &&
          !admin.handshakeOwnerIsLsp6ControllerOfUp && (
          <GlassCard>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-theme-text">Not authorized</p>
                <p className="mt-1 text-sm text-theme-text-muted">
                  The connected wallet <span className="font-mono">{shortAddrWallet}</span> is not
                  the owner{" "}
                  {admin.state.owner ? (
                    <>
                      (<span className="font-mono">{shortAddr(admin.state.owner)}</span>)
                    </>
                  ) : (
                    ""
                  )}{" "}
                  or fee collector on {chainName}, and LSP6 does not list the Handshake owner as a
                  controller of this profile. Admin controls are hidden.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {isAdminChain && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              icon={Coins}
              label="Current fee"
              value={feeDisplay}
              hint="Per vouch, sent with tx value"
            />
            <MetricTile
              icon={Wallet}
              label="Accumulated fees"
              value={`${admin.accumulatedFeesFormatted} ${nativeSymbol}`}
              hint="Withdrawable by collector/owner"
            />
            <MetricTile
              icon={BadgeCheck}
              label="Contract balance"
              value={`${admin.contractBalanceFormatted} ${nativeSymbol}`}
              hint="Raw native balance on-chain"
            />
            <MetricTile
              icon={KeyRound}
              label="Owner"
              value={shortAddr(admin.state.owner)}
              hint={admin.state.feeCollector ? `Collector ${shortAddr(admin.state.feeCollector)}` : undefined}
            />
          </section>
        )}

        {isAdminChain &&
          isConnected &&
          (admin.isOwner || admin.canWithdraw || admin.handshakeOwnerIsLsp6ControllerOfUp) &&
          admin.state.owner && (
          <GlassCard>
            <h3 className="text-sm font-semibold text-theme-text">Your wallet vs contract roles</h3>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-theme-text-dim">Connected (eth_accounts)</dt>
                <dd className="break-all font-mono text-theme-text">{account}</dd>
              </div>
              <div>
                <dt className="text-theme-text-dim">Handshake owner()</dt>
                <dd className="break-all font-mono text-theme-text">{admin.state.owner}</dd>
              </div>
              <div>
                <dt className="text-theme-text-dim">feeCollector()</dt>
                <dd className="break-all font-mono text-theme-text">{admin.state.feeCollector ?? "—"}</dd>
              </div>
            </dl>
          </GlassCard>
        )}

        {isAdminChain &&
          (admin.isOwner || admin.canWithdraw || admin.handshakeOwnerIsLsp6ControllerOfUp) && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-theme-text">Admin actions</h2>

            {admin.lsp6ControllerCheckLoading && (chainId === 42 || chainId === 4201) && (
              <p className="text-xs text-theme-text-dim">Checking LSP6 controllers on your profile…</p>
            )}

            {admin.handshakeOwnerIsLsp6ControllerOfUp && (chainId === 42 || chainId === 4201) && (
              <GlassCard>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="space-y-2 text-sm text-theme-text-muted">
                    <p className="font-semibold text-theme-text">Controller link verified (LSP6)</p>
                    <p>
                      Handshake <span className="font-mono">owner()</span>{" "}
                      <span className="font-mono text-theme-text">{admin.state.owner}</span> is listed in
                      this profile&apos;s{" "}
                      <code className="rounded bg-theme-surface-strong px-1 text-xs">AddressPermissions[]</code>{" "}
                      (see{" "}
                      <a
                        href="https://docs.lukso.tech/learn/universal-profile/key-manager/get-controller-permissions/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme-accent underline"
                      >
                        LUKSO: controller permissions
                      </a>
                      ). The app uses that to confirm you&apos;re the right operator for this deployment.
                    </p>
                    <p>
                      <span className="font-semibold text-theme-text">Important:</span> Handshake still uses
                      OpenZeppelin <span className="font-semibold">Ownable</span>. On-chain{" "}
                      <span className="font-semibold">setFee</span> /{" "}
                      <span className="font-semibold">setFeeCollector</span> require{" "}
                      <span className="font-mono">msg.sender == owner()</span> on the Handshake contract. Calls routed
                      through your UP use your <span className="font-semibold">profile</span> as the sender for those
                      inner calls, so <span className="font-semibold">owner()</span> should be your profile address for
                      owner tools to work from the UP extension — use{" "}
                      <span className="font-semibold">Transfer contract ownership</span> once from the controller
                      wallet, or connect with the controller for owner transactions.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {luksoUpSignerMismatch && (
              <GlassCard>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-theme-text">
                      Why owner tools are missing (Universal Profile on LUKSO)
                    </p>
                    <p className="text-theme-text-muted">
                      On-chain <span className="font-semibold text-theme-text">owner()</span> is your{" "}
                      <span className="font-semibold text-theme-text">controller</span> wallet{" "}
                      <span className="font-mono text-theme-text">{admin.state.owner}</span>, but you are connected as
                      your profile <span className="font-mono text-theme-text">{account}</span>. The UP extension sends
                      transactions from the profile address, so <code className="rounded bg-theme-surface-strong px-1 text-xs">onlyOwner</code>{" "}
                      checks fail unless <span className="font-mono">msg.sender</span> equals the owner.
                    </p>
                    <p className="text-theme-text-muted">
                      <span className="font-semibold text-theme-text">Withdraw</span> works because your profile is the
                      fee collector.
                    </p>
                    <p className="text-theme-text-muted">
                      <span className="font-semibold text-theme-text">Fix:</span> connect once with the controller key (
                      <span className="font-mono">{shortAddr(admin.state.owner)}</span>) in MetaMask or another EOA
                      wallet, open this page, and use <span className="font-semibold">Transfer contract ownership</span>{" "}
                      to set owner to your Universal Profile (
                      <span className="font-mono">{shortAddr(admin.state.feeCollector)}</span> is pre-filled if it
                      matches your collector). Then reconnect with the UP extension — full admin will work from your
                      profile.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {(admin.txError || admin.error || actionNotice) && (
              <div
                className={`glass-card rounded-2xl border p-3 text-sm ${
                  admin.txError || admin.error
                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                    : "border-theme-accent/40 bg-theme-accent-soft text-theme-accent"
                }`}
              >
                {admin.txError || admin.error || actionNotice}
              </div>
            )}

            <GlassCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-theme-text">
                    Withdraw accumulated fees
                  </h3>
                  <p className="mt-1 text-sm text-theme-text-muted">
                    Sends the on-contract balance to the current fee collector (
                    <span className="font-mono">{shortAddr(admin.state.feeCollector)}</span>).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-theme-text">
                    {admin.accumulatedFeesFormatted} {nativeSymbol}
                  </span>
                  <GlowButton
                    variant="primary"
                    disabled={!withdrawable || admin.txPending || !admin.canWithdraw}
                    onClick={handleWithdraw}
                  >
                    <Download className="mr-1 inline h-4 w-4" />
                    {admin.txPending ? "Sending…" : "Withdraw"}
                  </GlowButton>
                </div>
              </div>
            </GlassCard>

            {admin.isOwner && (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <GlassCard>
                    <h3 className="text-base font-semibold text-theme-text">Update vouch fee</h3>
                    <p className="mt-1 text-sm text-theme-text-muted">
                      Amount in {nativeSymbol}. Current:{" "}
                      <span className="font-mono">{feeDisplay}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={`e.g. 0.001 ${nativeSymbol}`}
                        value={feeInput}
                        onChange={(e) => setFeeInput(e.target.value)}
                        className="min-w-[180px] flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none"
                      />
                      <GlowButton
                        variant="secondary"
                        disabled={admin.txPending}
                        onClick={handleSetFee}
                      >
                        Set fee
                      </GlowButton>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <h3 className="text-base font-semibold text-theme-text">Update fee collector</h3>
                    <p className="mt-1 text-sm text-theme-text-muted">
                      Current:{" "}
                      <span className="font-mono">{shortAddr(admin.state.feeCollector)}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="0x…"
                        value={collectorInput}
                        onChange={(e) => setCollectorInput(e.target.value)}
                        className="min-w-[180px] flex-1 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none"
                      />
                      <GlowButton
                        variant="secondary"
                        disabled={admin.txPending}
                        onClick={handleSetCollector}
                      >
                        Set collector
                      </GlowButton>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard>
                  <h3 className="text-base font-semibold text-theme-text">Transfer contract ownership</h3>
                  <p className="mt-1 text-sm text-theme-text-muted">
                    Moves Ownable admin to a new address. Use this to set <span className="font-semibold">owner</span>{" "}
                    to your Universal Profile so the UP browser extension can run set-fee and other owner calls. Fee
                    collector is unchanged unless you update it above.
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1">
                      <label htmlFor="admin-new-owner" className="sr-only">
                        New owner address
                      </label>
                      <input
                        id="admin-new-owner"
                        type="text"
                        placeholder="0x… new owner (e.g. your UP)"
                        value={transferOwnerInput}
                        onChange={(e) => setTransferOwnerInput(e.target.value)}
                        className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 font-mono text-sm text-theme-text placeholder:text-theme-dim focus:border-theme-accent focus:outline-none"
                      />
                    </div>
                    <GlowButton variant="secondary" disabled={admin.txPending} onClick={handleTransferOwnership}>
                      Transfer ownership
                    </GlowButton>
                  </div>
                </GlassCard>
              </>
            )}
          </section>
        )}

        {isAdminChain && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-theme-text">Protocol metrics</h2>
                <p className="text-sm text-theme-text-muted">
                  Scans Handshake events on {chainName}. Can take 10–60s on public RPCs.
                </p>
              </div>
              <div className="flex gap-2">
                <GlowButton
                  variant="secondary"
                  disabled={metricsHook.loading}
                  onClick={() => admin.refresh()}
                >
                  <RefreshCw className="mr-1 inline h-4 w-4" />
                  Refresh state
                </GlowButton>
                {metricsHook.loading ? (
                  <GlowButton variant="secondary" onClick={metricsHook.cancel}>
                    Cancel scan ({metricsHook.progress}%)
                  </GlowButton>
                ) : (
                  <GlowButton variant="primary" onClick={() => metricsHook.scan()}>
                    <BarChart3 className="mr-1 inline h-4 w-4" />
                    {metricsHook.metrics ? "Re-run scan" : "Run scan"}
                  </GlowButton>
                )}
              </div>
            </div>

            {metricsHook.loading && (
              <div className="glass-card rounded-2xl border border-theme-border bg-theme-surface p-4">
                <p className="text-sm text-theme-text-muted">
                  Scanning blocks… {metricsHook.progress}%
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-theme-surface-strong">
                  <div
                    className="h-full bg-theme-accent transition-all"
                    style={{ width: `${Math.min(100, metricsHook.progress)}%` }}
                  />
                </div>
              </div>
            )}

            {metricsHook.error && (
              <div className="glass-card rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                {metricsHook.error}
              </div>
            )}

            {metricsHook.metrics && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricTile
                    icon={Users}
                    label="Unique users"
                    value={metricsHook.metrics.uniqueUsers}
                    hint={`${metricsHook.metrics.uniqueVouchers} vouchers · ${metricsHook.metrics.uniqueTargets} targets`}
                  />
                  <MetricTile
                    icon={Activity}
                    label="Total vouches"
                    value={metricsHook.metrics.totalVouches}
                    hint="VouchRequested events"
                  />
                  <MetricTile
                    icon={BadgeCheck}
                    label="Accepted"
                    value={metricsHook.metrics.accepted}
                    hint={
                      metricsHook.metrics.totalVouches > 0
                        ? `${Math.round(
                            (metricsHook.metrics.accepted / metricsHook.metrics.totalVouches) * 100
                          )}% accept rate`
                        : undefined
                    }
                  />
                  <MetricTile
                    icon={AlertTriangle}
                    label="Pending"
                    value={metricsHook.metrics.pending}
                    hint="Awaiting target action"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricTile icon={AlertTriangle} label="Denied" value={metricsHook.metrics.denied} />
                  <MetricTile icon={AlertTriangle} label="Cancelled" value={metricsHook.metrics.cancelled} />
                  <MetricTile icon={AlertTriangle} label="Removed" value={metricsHook.metrics.removed} />
                  <MetricTile
                    icon={Download}
                    label="Withdraw events"
                    value={metricsHook.metrics.feesWithdrawnTxCount}
                    hint="All-time withdrawals"
                  />
                </div>
                <p className="text-xs text-theme-text-dim">
                  Scanned block {metricsHook.metrics.fromBlock.toString()} →{" "}
                  {metricsHook.metrics.latestBlockScanned.toString()} on {chainName}.
                </p>
              </>
            )}

            {!metricsHook.metrics && !metricsHook.loading && !metricsHook.error && (
              <p className="text-sm text-theme-text-muted">
                Click <span className="font-semibold">Run scan</span> to pull event-level metrics.
              </p>
            )}
          </section>
        )}

        {isAdminChain && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-theme-text">Contract</h2>
            <GlassCard>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-theme-text-dim">Address</dt>
                  <dd className="font-mono text-theme-text">{admin.handshakeAddress ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-theme-text-dim">Chain</dt>
                  <dd className="text-theme-text">
                    {chainName} (id {chainId})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-theme-text-dim">Owner</dt>
                  <dd className="font-mono text-theme-text">{admin.state.owner ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-theme-text-dim">Fee collector</dt>
                  <dd className="font-mono text-theme-text">{admin.state.feeCollector ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-theme-text-dim">
                    Ohana Points hub
                  </dt>
                  <dd className="font-mono text-theme-text">
                    {admin.state.ohanaPointsHub ?? "Not linked"}
                  </dd>
                </div>
              </dl>
            </GlassCard>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminPage;

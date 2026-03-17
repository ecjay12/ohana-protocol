/**
 * Vouch Graph page — 3D visualization of vouch network.
 * Route: /vouch-graph (no nav link; access via URL).
 */

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileVouches } from "@/hooks/useProfileVouches";
import { useVouchGraphData } from "@/hooks/useVouchGraphData";
import { useProfileNamesForAddresses } from "@/hooks/useProfileNamesForAddresses";
import { VouchGraph3D } from "@/components/VouchGraph3D";

export function VouchGraphPage() {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const { vouchersForTarget, targetsVouchedBy, loading } = useProfileVouches(account, wallet.chainId);
  const graphData = useVouchGraphData(account, vouchersForTarget, targetsVouchedBy);
  const nodeLabels = useProfileNamesForAddresses(graphData.nodes, wallet.chainId);
  const { profileData: userProfileData, isUP: userIsUP } = useProfileData(
    wallet.provider,
    account,
    wallet.chainId
  );

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={account ? `${account.slice(0, 6)}…${account.slice(-4)}` : ""}
      account={account}
      isConnected={wallet.isConnected}
      hasInjected={wallet.hasInjected}
      availableWallets={wallet.availableWallets}
      walletError={wallet.error}
      userProfileData={userProfileData}
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-4 sm:py-8 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>

        <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
          <h1 className="mb-2 text-xl font-semibold text-theme-text">Vouch Network</h1>
          <p className="mb-6 text-sm text-theme-text-muted">
            Your vouch connections in 3D. Blue = you, green = who vouched for you, purple = who you vouched for.
          </p>

          {!wallet.isConnected ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-theme-border bg-theme-background/50">
              <p className="text-theme-text-muted text-sm">Connect your wallet to view your vouch network.</p>
            </div>
          ) : loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-theme-border bg-theme-background/50">
              <p className="text-theme-text-muted text-sm">Loading vouches…</p>
            </div>
          ) : (
            <VouchGraph3D data={graphData} nodeLabels={nodeLabels} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

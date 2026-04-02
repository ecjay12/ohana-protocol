/**
 * Global vouch graph — LUKSO mainnet Handshake vouches (browser RPC, no server).
 * Ego graph for a single profile lives on /profile/:address.
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";
import { useGlobalVouchGraph } from "@/hooks/useGlobalVouchGraph";
import { useProfileNamesForAddresses } from "@/hooks/useProfileNamesForAddresses";
import { LUKSO_SOCIAL_GRAPH_CHAIN_ID } from "@/lib/luksoHandshakeVouchGraph";
import { VouchGraph3D } from "@/components/VouchGraph3D";

export function VouchGraphPage() {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const { data: globalData, loading, error: graphError } = useGlobalVouchGraph();
  const graphPayload = globalData
    ? {
        nodes: globalData.nodes,
        edges: globalData.edges,
        centerAddress: null as string | null,
      }
    : { nodes: [] as string[], edges: [] as { voucher: string; target: string; strength: number }[], centerAddress: null as string | null };
  const nodeLabels = useProfileNamesForAddresses(
    graphPayload.nodes,
    LUKSO_SOCIAL_GRAPH_CHAIN_ID,
    { chainIdsForLookup: [LUKSO_SOCIAL_GRAPH_CHAIN_ID, 4201] }
  );
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, account, wallet.chainId);

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
      userProfileLoading={userProfileLoading}
      userIsUP={userIsUP}
      onConnect={wallet.connect}
      onConnectWith={wallet.connectWith}
      onSwitchChain={wallet.switchChain}
      onDisconnect={wallet.disconnect}
    >
      <div className="mx-auto min-w-0 max-w-5xl space-y-6 px-3 py-6 sm:px-4 sm:py-8 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-sm text-theme-text-muted transition-colors hover:text-theme-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>

        <div className="min-w-0 rounded-2xl border border-theme-border bg-theme-surface p-4 sm:p-6">
          <h1 className="mb-2 text-balance text-xl font-semibold text-theme-text">Handshake network graph</h1>
          <p className="mb-4 text-sm leading-relaxed text-theme-text-muted content-safe">
            <strong className="font-medium text-theme-text">LUKSO mainnet</strong> — accepted vouches between Universal Profiles. Loaded in-browser via public RPC. Open a{" "}
            <Link to={account ? `/profile/${account}` : "/app"} className="text-theme-accent hover:underline">
              profile
            </Link>{" "}
            for a graph centered on that identity.
          </p>

          {graphError && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {graphError}
            </div>
          )}

          {globalData?.message && !graphError && (
            <div className="mb-4 flex gap-2 rounded-xl border border-theme-border bg-theme-background/60 px-3 py-2 text-sm text-theme-text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" aria-hidden />
              <span>{globalData.message}</span>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-theme-border bg-theme-background/50">
              <p className="text-theme-text-muted text-sm">Loading network graph…</p>
            </div>
          ) : (
            <VouchGraph3D data={graphPayload} nodeLabels={nodeLabels} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

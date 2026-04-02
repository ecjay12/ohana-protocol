/**
 * Full-page vouch leaderboard (mobile / direct link).
 */

import { AppLayout } from "@/layout/AppLayout";
import { useInjectedWallet } from "@/hooks/useInjectedWallet";
import { useProfileData } from "@/hooks/useProfileData";
import { VouchLeaderboardCard } from "@/components/VouchLeaderboardCard";

export function LeaderboardPage() {
  const wallet = useInjectedWallet();
  const account = wallet.accounts[0] ?? null;
  const shortAddr = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : "";
  const { profileData: userProfileData, isUP: userIsUP, loading: userProfileLoading } =
    useProfileData(wallet.provider, account, wallet.chainId);

  return (
    <AppLayout
      chainId={wallet.chainId}
      chains={wallet.chains as Record<number, { name: string; rpc: string }>}
      shortAddress={shortAddr}
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
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-10">
        <h1 className="mb-6 text-2xl font-semibold text-theme-text">Leaderboard</h1>
        <VouchLeaderboardCard />
      </div>
    </AppLayout>
  );
}

import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Footer } from "@/components/Footer";
import type { WalletOption } from "@/hooks/useInjectedWallet";
import type { ProfileData } from "@/lib/lsp4Profile";

interface AppLayoutProps {
  children: ReactNode;
  chainId: number;
  chains: Record<number, { name: string; rpc: string }>;
  shortAddress: string;
  account?: string;
  isConnected: boolean;
  hasInjected: boolean;
  availableWallets: WalletOption[];
  walletError: string | null;
  userProfileData?: ProfileData | null;
  userIsUP?: boolean;
  onConnect: () => void;
  onConnectWith: (wallet: WalletOption) => void;
  onSwitchChain: (chainId: number) => void;
  onDisconnect: () => void;
}

export function AppLayout({
  children,
  chainId,
  chains,
  shortAddress,
  account,
  isConnected,
  hasInjected,
  availableWallets,
  walletError,
  userProfileData,
  userIsUP,
  onConnect,
  onConnectWith,
  onSwitchChain,
  onDisconnect,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-theme-background">
      <Sidebar
        chainId={chainId}
        chains={chains}
        shortAddress={shortAddress}
        account={account}
        isConnected={isConnected}
        hasInjected={hasInjected}
        availableWallets={availableWallets}
        walletError={walletError}
        userProfileData={userProfileData}
        userIsUP={userIsUP}
        onConnect={onConnect}
        onConnectWith={onConnectWith}
        onSwitchChain={onSwitchChain}
        onDisconnect={onDisconnect}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-auto bg-theme-background">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
